from fastapi import APIRouter, FastAPI, File, UploadFile, HTTPException, Request, Depends, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.templating import _TemplateResponse
from fastapi.security import OAuth2PasswordRequestForm
import io
from PIL import Image
import os
import cv2
import numpy as np
import uuid
import time
from utils.room_processing import *
from utils.texture_mapping import get_wall_corners, map_texture, load_texture, image_resize
from wall_segmentation.segmenation import wall_segmenting, build_model
from wall_estimation.estimation import wall_estimation
from warnings import filterwarnings

from database.database import Base, engine, SessionLocal, get_db
from sqlalchemy import inspect
from sqlalchemy.orm import Session, joinedload
import glob

from auth.auth import auth, get_user, get_password_hash, verify_password, create_access_token
from passlib.context import CryptContext
from datetime import datetime, timedelta
import logging
logging.basicConfig(level=logging.DEBUG)
from jose import JWTError, jwt

from fastapi import Query, Depends, HTTPException, Request, Form
from functools import wraps
from typing import Callable
from auth.dependencies import get_current_user

from routes.cart import router as cart_router
from routes.checkout import router as checkout_router

from routes.projects import router as projects_router
from enterprise import enterprise_middleware
from routes.enterprise import router as enterprise_router
from enterprise import get_enterprise, get_enterprise_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create all tables
Base.metadata.create_all(bind=engine)

# Security settings
SECRET_KEY = "S3CUR3#AUTH@B3TT3R"  # Change this to a secure random string
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_password_hash(password):
    return pwd_context.hash(password)

# Try to import better_auth, but provide fallback if not available
# try:
#     from better_auth import BetterAuth, User, Role, Permission
#     auth_available = True
# except ImportError:
#     print("Warning: better_auth module not available. Authentication features will be disabled.")
#     auth_available = False

filterwarnings("ignore")

# ----------------------------------------------------------------------
IMG_FOLDER = 'static/IMG/'
DATA_FOLDER = 'static/data/'

from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import secrets


class ForwardedProtoMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.headers.get("x-forwarded-proto") == "https":
            request.scope["scheme"] = "https"
        response = await call_next(request)
        return response

app = FastAPI()
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(ForwardedProtoMiddleware)
# Add this middleware after your other middleware definitions
app.middleware("http")(enterprise_middleware)

app.add_middleware(
    SessionMiddleware, 
    secret_key=os.environ.get("SECRET_KEY", secrets.token_urlsafe(32)),
    max_age=60 * 60 * 24 * 7,  # 1 week in seconds
    same_site="lax",
    https_only=False  # Set to True in production with HTTPS
)


# Add middleware to handle port forwarding
@app.middleware("http")
async def add_port_to_urls(request: Request, call_next):
    # Check if we're running on a non-standard port via reverse proxy
    if request.headers.get("host") and ":8080" not in request.headers.get("host"):
        # If the original host doesn't have port, but we're behind proxy
        if "localhost" in request.headers.get("host", ""):
            # Modify the host header to include the port
            request.scope["headers"] = [
                (name, value.replace(b"localhost", b"localhost:8080") if name == b"host" else value)
                for name, value in request.scope["headers"]
            ]
    
    response = await call_next(request)
    return response

# Add this middleware after your other middleware definitions
@app.middleware("http")
async def add_user_to_request(request: Request, call_next):
    """Add the current user to all requests."""
    response = await call_next(request)
    
    # We can't modify the request once it's been processed,
    # but we can ensure our route handlers have access to the user
    return response

@app.middleware("http")
async def add_enterprise_to_request(request: Request, call_next):
    # Get enterprise context
    db = SessionLocal()
    try:
        # Extract host from request
        host = request.headers.get("host", "")
        print(f"Processing request for host: {host}")
        
        # Check for subdomain format
        if ".roomflux.com" in host:
            subdomain = host.split(".roomflux.com")[0]
            print(f"Detected subdomain: {subdomain}")
            
            # Look up the enterprise by subdomain
            enterprise = db.query(Enterprise).filter(
                Enterprise.subdomain == subdomain,
                Enterprise.active == True
            ).first()
            
            if enterprise:
                print(f"Found enterprise by subdomain: {enterprise.name}")
                request.state.enterprise = enterprise
                
                # If user is logged in, get enterprise user relationship
                current_user = await get_current_user(request, db)
                if current_user:
                    enterprise_user = db.query(EnterpriseUser).filter(
                        EnterpriseUser.enterprise_id == enterprise.id,
                        EnterpriseUser.user_id == current_user.id
                    ).first()
                    request.state.enterprise_user = enterprise_user
            else:
                print(f"No enterprise found for subdomain: {subdomain}")
        
        # If no enterprise found by subdomain, try custom domain
        if not getattr(request.state, "enterprise", None):
            enterprise = db.query(Enterprise).filter(
                Enterprise.custom_domain == host,
                Enterprise.active == True
            ).first()
            
            if enterprise:
                print(f"Found enterprise by custom domain: {enterprise.name}")
                request.state.enterprise = enterprise
    except Exception as e:
        print(f"Error setting enterprise context: {str(e)}")
    finally:
        db.close()
    
    response = await call_next(request)
    return response

@app.middleware("http")
async def add_template_context(request: Request, call_next):
    response = await call_next(request)
    
    # Only process HTML responses
    if response.headers.get("content-type", "").startswith("text/html"):
        # Get the current user, enterprise, and enterprise_user from request state
        current_user = getattr(request.state, "user", None)
        enterprise = getattr(request.state, "enterprise", None)
        enterprise_user = getattr(request.state, "enterprise_user", None)
        
        # Add debug logging
        print(f"Template context: user={current_user}, enterprise={enterprise}, enterprise_user={enterprise_user}")
        
        # Add these variables to all templates
        # Note: This is a simplified approach - in a real app, you'd modify the template context
        
    return response


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    
    # Try to get enterprise context
    try:
        db = SessionLocal()
        enterprise = await get_enterprise(request, db)
        if enterprise:
            request.state.enterprise = enterprise
            logger.info(f"Set enterprise context: {enterprise.name}")
        db.close()
    except Exception as e:
        logger.error(f"Error setting enterprise context: {str(e)}")
    
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Mount the auth routes
app.include_router(auth.router, prefix="/api/auth")

# Admin and Tile router
from routes.tiles import router as tiles_router
from routes.admin import router as admin_router
app.include_router(tiles_router, prefix="/api")
app.include_router(admin_router)
from database.models import Base, Tile, User, RoomDesign, Enterprise, EnterpriseUser, EnterpriseMaterial, EnterpriseSampleRoom, Accessory, AccessoryCategory, Enterprise3DRoom

# Cart routers
app.include_router(cart_router, prefix="/api/cart", tags=["cart"])
app.include_router(checkout_router)

# Project routers
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])

# Enterprise Router
app.include_router(enterprise_router)

# Accessories router
from routes.accessories import router as accessories_router
app.include_router(accessories_router, prefix="/api/accessories", tags=["accessories"])

# Setup Jinja2 templates
templates = Jinja2Templates(directory="templates")

os.makedirs("static/tiles", exist_ok=True)
os.makedirs("static/textures", exist_ok=True)

# Mount static files 
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# Load pretrained wall segmentation model
model = build_model()

# Store filenames globally for now (Consider a better state management)
file_paths = {}

# ----------------------------------------------------------------------

# Unique filename generator
def generate_unique_filename(base_name, extension=".jpg"):
    timestamp = int(time.time())
    unique_id = str(uuid.uuid4())
    return f"{base_name}_{timestamp}_{unique_id}{extension}"


async def get_user_for_template(request: Request, db: Session = Depends(get_db)):
    """Get the current user for template rendering."""
    logging.debug("Checking for current user in request")
    try:
        token = request.cookies.get("access_token")
        logging.debug(f"Token from cookies: {token is not None}")
        if not token:
            logging.debug("No token found in cookies")
            return None
            
        # Verify the token and get the user ID
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        logging.debug(f"User ID from token: {user_id}")
        if not user_id:
            logging.debug("No user ID in token")
            return None
            
        # Get the user from the database
        user = db.query(User).filter(User.id == user_id).first()
        logging.debug(f"User found in database: {user is not None}")
        if user:
            logging.debug(f"User details: ID={user.id}, Username={user.username}")
        return user
    except Exception as e:
        logging.error(f"Error getting current user for template: {str(e)}")
        return None

# Get current user helper function
# async def get_current_user(request: Request, db: Session = Depends(get_db)):
#     """Get the current logged-in user from the request."""
#     try:
#         # Get the token from the cookie
#         token = request.cookies.get("access_token")
#         if not token:
#             return None
            
#         # Verify the token and get the user ID
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         user_id = payload.get("sub")
#         if not user_id:
#             return None
            
#         # Get the user from the database
#         user = db.query(User).filter(User.id == user_id).first()
#         return user
#     except Exception as e:
#         logging.error(f"Error getting current user: {str(e)}")
#         return None

# --------------------------START HTML PAGES----------------------------
@app.get("/", response_class=HTMLResponse)
async def main(request: Request, current_user=Depends(get_user_for_template), enterprise = Depends(get_enterprise)):
    return templates.TemplateResponse("index.html", {"request": request, "user": current_user, "enterprise": enterprise})

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy"}

@app.get("/debug/enterprises")
async def debug_enterprise(request: Request,db: Session = Depends(get_db),enterprise = Depends(get_enterprise)):
    """Debug endpoint to list all enterprises"""
    try:
        enterprises = db.query(Enterprise).all()
        return {
            "count": len(enterprises),
            "enterprises": [
                {
                    "id": e.id,
                    "name": e.name,
                    "subdomain": e.subdomain,
                    "custom_domain": e.custom_domain,
                    "active": e.active
                } for e in enterprises
            ]
        }
    except Exception as e:
        return {"error": str(e)}

# @app.get("/room_visualization_index")
# async def room_visualization_index(request: Request, current_user = Depends(get_user_for_template), db: Session = Depends(get_db)):
#     # Get all tiles from the database
#     all_tiles = db.query(Tile).all()
    
#     # Get sample room images from the static folder
#     sample_rooms = []
#     sample_room_path = "static/test_images/rooms"
#     if os.path.exists(sample_room_path):
#         for img_path in glob.glob(f"{sample_room_path}/*.jpg") + glob.glob(f"{sample_room_path}/*.png"):
#             # Convert to relative path for the template
#             relative_path = img_path.replace("\\", "/")  # Handle Windows paths
#             sample_rooms.append(relative_path)
    
#     # For visitors, limit materials to 4 (one from each category)
#     if not current_user:
#         # Group tiles by material type
#         tiles_by_type = {}
#         for tile in all_tiles:
#             material_type = tile.material
#             if material_type not in tiles_by_type:
#                 tiles_by_type[material_type] = []
#             tiles_by_type[material_type].append(tile)
        
#         # Select one tile from each category
#         limited_tiles = []
#         for material_type, tiles in tiles_by_type.items():
#             if tiles:
#                 limited_tiles.append(tiles[0])  # Add the first tile of each type
        
#         tiles = limited_tiles
#     else:
#         tiles = all_tiles
    
#     return templates.TemplateResponse("room_visualization_index.html", {
#         "request": request, 
#         "room": None,
#         "images": tiles,
#         "sample_rooms": sample_rooms if sample_rooms else None,
#         "user": current_user
#     })

# @app.get("/room_visualization_index")
# async def room_visualization_index(request: Request, current_user = Depends(get_user_for_template), db: Session = Depends(get_db),
#     enterprise = Depends(get_enterprise)):
    
#     # Initialize all_tiles variable
#     all_tiles = []
    
#     # If in enterprise context, get enterprise-specific tiles
#     if enterprise:
#         # Get enterprise materials
#         enterprise_materials = db.query(EnterpriseMaterial).filter(
#             EnterpriseMaterial.enterprise_id == enterprise.id,
#             EnterpriseMaterial.visible == True
#         ).all()
        
#         # Get the actual tile IDs
#         tile_ids = [em.tile_id for em in enterprise_materials]
        
#         # Query tiles with these IDs
#         tiles = db.query(Tile).filter(Tile.id.in_(tile_ids)).all()
#     else:
#         # Get all tiles from the database
#         all_tiles = db.query(Tile).all()
    
#     # Get all tiles from the database
#     # all_tiles = db.query(Tile).all()

#     # Get enterprise-specific sample rooms if in enterprise context
#     sample_room = None
#     if enterprise:
#         # Check if enterprise has custom sample rooms
#         sample_rooms = db.query(EnterpriseSampleRoom).filter(
#             EnterpriseSampleRoom.enterprise_id == enterprise.id,
#             EnterpriseSampleRoom.category == "living_room"  # Default category
#         ).first()
        
#         if sample_rooms:
#             sample_room = sample_rooms.image_path
#     else:
#         # If no enterprise context, get sample room images from the static folder and organize by category
#         sample_rooms_by_category = {}
#         sample_room_path = "static/test_images/rooms"
        
#         if os.path.exists(sample_room_path):
#             # Get all subdirectories (categories)
#             categories = [d for d in os.listdir(sample_room_path) 
#                         if os.path.isdir(os.path.join(sample_room_path, d))]
            
#             # If no subdirectories exist, use the main folder as a single category
#             if not categories:
#                 categories = ["All Rooms"]
#                 sample_rooms_by_category["All Rooms"] = []
                
#                 for img_path in glob.glob(f"{sample_room_path}/*.jpg") + glob.glob(f"{sample_room_path}/*.png"):
#                     # Convert to relative path for the template
#                     relative_path = img_path.replace("\\", "/")  # Handle Windows paths
#                     sample_rooms_by_category["All Rooms"].append(relative_path)
#             else:
#                 # Process each category folder
#                 for category in categories:
#                     category_path = os.path.join(sample_room_path, category)
#                     sample_rooms_by_category[category] = []
                    
#                     for img_path in glob.glob(f"{category_path}/*.jpg") + glob.glob(f"{category_path}/*.png"):
#                         # Convert to relative path for the template
#                         relative_path = img_path.replace("\\", "/")  # Handle Windows paths
#                         sample_rooms_by_category[category].append(relative_path)
    
#     # For visitors, limit materials to 4 (one from each category)
#     if not current_user:
#         # Group tiles by material type
#         tiles_by_type = {}
#         for tile in all_tiles:
#             material_type = tile.material
#             if material_type not in tiles_by_type:
#                 tiles_by_type[material_type] = []
#             tiles_by_type[material_type].append(tile)
        
#         # Select one tile from each category
#         limited_tiles = []
#         for material_type, tiles in tiles_by_type.items():
#             if tiles:
#                 limited_tiles.append(tiles[0])  # Add the first tile of each type
        
#         tiles = limited_tiles
#     else:
#         tiles = all_tiles
    
#     return templates.TemplateResponse("room_visualization_index.html", {
#         "request": request, 
#         "room": None,
#         "images": tiles,
#         "sample_rooms_by_category": sample_rooms_by_category,
#         "sample_room_categories": list(sample_rooms_by_category.keys()),
#         "user": current_user,
#         "enterprise": enterprise
#     })

@app.get("/room_visualization_index")
async def room_visualization_index(request: Request, current_user = Depends(get_user_for_template), db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)):
    
    inspector = inspect(EnterpriseMaterial)
    print("EnterpriseMaterial columns:", [c.name for c in inspector.columns])
    
    # Initialize all_tiles variable
    all_tiles = []
    # Initialize sample_rooms_by_category to avoid UnboundLocalError
    sample_rooms_by_category = {}
    
    # Get enterprise_user if user is logged in and enterprise exists
    enterprise_user = None
    if current_user and enterprise:
        enterprise_user = db.query(EnterpriseUser).filter(
            EnterpriseUser.enterprise_id == enterprise.id,
            EnterpriseUser.user_id == current_user.id
        ).first()
    
    # If in enterprise context, get enterprise-specific tiles
    if enterprise:
        # Simple query: Get all tiles for this enterprise
        all_tiles = db.query(Tile).filter(
            Tile.enterprise_id == enterprise.id
        ).all()
        
        # If no tiles found, try the legacy approach with EnterpriseMaterial
        if not all_tiles:
            # Get tile IDs from EnterpriseMaterial
            tile_ids = [
                tile_id for (tile_id,) in 
                db.query(EnterpriseMaterial.tile_id).filter(
                    EnterpriseMaterial.enterprise_id == enterprise.id
                ).all()
            ]
            
            # Query tiles with these IDs
            if tile_ids:
                all_tiles = db.query(Tile).filter(Tile.id.in_(tile_ids)).all()
                
    else:
        # For main site, get all tiles (we can add filters later)
        enterprise_tiles = db.query(Tile).filter(
            Tile.enterprise_id != None
        ).all()
        enterprise_tile_ids = [tile.id for tile in enterprise_tiles]
        
        # Get all tiles associated through EnterpriseMaterial
        enterprise_material_tile_ids = [
            tile_id for (tile_id,) in 
            db.query(EnterpriseMaterial.tile_id).distinct().all()
        ]
        
        # Combine both sets of enterprise tile IDs
        all_enterprise_tile_ids = list(set(enterprise_tile_ids + enterprise_material_tile_ids))
        
        # Get public enterprise material tile IDs
        public_enterprise_material_tile_ids = [
            tile_id for (tile_id,) in 
            db.query(EnterpriseMaterial.tile_id).filter(
                EnterpriseMaterial.visible == True
            ).all()
        ]
        
        # Get all tiles
        all_tiles = db.query(Tile).all()
        
        # Filter tiles
        filtered_tiles = []
        for tile in all_tiles:
            if tile.id in all_enterprise_tile_ids:
                # This is an enterprise tile
                if tile.id in public_enterprise_material_tile_ids:
                    # It's public, include it
                    filtered_tiles.append(tile)
                    print(f"Including public enterprise tile: {tile.id} - {tile.name}")
                else:
                    print(f"Excluding non-public enterprise tile: {tile.id} - {tile.name}")
            else:
                # Not an enterprise tile, include it
                filtered_tiles.append(tile)
                print(f"Including non-enterprise tile: {tile.id} - {tile.name}")
        
        print(f"Original tiles: {len(all_tiles)}, Filtered tiles: {len(filtered_tiles)}")
        all_tiles = filtered_tiles

        print(f"Tiles after filtering: {len(all_tiles)}")


    # Print debug info
    print(f"Found tiles... {len(all_tiles)} ")

        # Apply the same filtering logic to accessories
    if enterprise:
        # Enterprise context: get enterprise-specific + public accessories
        enterprise_accessories = db.query(Accessory).filter(
            Accessory.enterprise_id == enterprise.id,
            Accessory.is_approved == True
        ).all()
        
        # Get public accessories (available to all)
        public_accessories = db.query(Accessory).filter(
            Accessory.is_public == True,
            Accessory.is_approved == True
        ).all()
        
        # Combine and deduplicate
        all_accessories = enterprise_accessories + public_accessories
        seen_ids = set()
        filtered_accessories = []
        for acc in all_accessories:
            if acc.id not in seen_ids:
                filtered_accessories.append(acc)
                seen_ids.add(acc.id)
    else:
        # Public context: only show public accessories
        filtered_accessories = db.query(Accessory).filter(
            Accessory.is_public == True,
            Accessory.is_approved == True
        ).all()
    
    # For visitors, limit accessories (similar to tiles)
    if not current_user:
        # Group accessories by category and limit to 1 per category
        accessories_by_category = {}
        for accessory in filtered_accessories:
            category = accessory.accessory_category.id
            if category not in accessories_by_category:
                accessories_by_category[category] = []
            accessories_by_category[category].append(accessory)
        
        # Select one accessory from each category
        limited_accessories = []
        for category, accessories in accessories_by_category.items():
            if accessories:
                limited_accessories.append(accessories[0])
        
        accessories = limited_accessories
    else:
        accessories = filtered_accessories
    
    # Get enterprise 3D rooms if we're in enterprise context
    enterprise_3d_rooms = []
    if enterprise:
        enterprise_3d_rooms = db.query(Enterprise3DRoom).filter(
            Enterprise3DRoom.enterprise_id == enterprise.id,
            Enterprise3DRoom.is_active == True
        ).all()

    # Get enterprise-specific sample rooms if in enterprise context
    sample_room = None
    if enterprise:
        # Check if enterprise has custom sample rooms
        sample_rooms = db.query(EnterpriseSampleRoom).filter(
            EnterpriseSampleRoom.enterprise_id == enterprise.id
        ).all()
        
        print(f"Found {len(sample_rooms)} sample rooms for enterprise {enterprise.id}")
        
        if sample_rooms:
            # Get the living room sample or the first sample room
            living_room = next((room for room in sample_rooms if room.category == "living_room"), None)
            sample_room = living_room.image_path if living_room else sample_rooms[0].image_path
            
            # Also create a sample_rooms_by_category dict for enterprise
            sample_rooms_by_category = {}
            for room in sample_rooms:
                category = room.category
                if category not in sample_rooms_by_category:
                    sample_rooms_by_category[category] = []
                sample_rooms_by_category[category].append(room.image_path)
            
            print(f"Enterprise sample room: {sample_room}")
            print(f"Enterprise sample rooms by category: {sample_rooms_by_category}")
    else:
        # If no enterprise context, get sample room images from the static folder and organize by category
        sample_room_path = "static/test_images/rooms"
        
        if os.path.exists(sample_room_path):
            # Get all subdirectories (categories)
            categories = [d for d in os.listdir(sample_room_path) 
                        if os.path.isdir(os.path.join(sample_room_path, d))]
            
            print(f"Found categories: {categories}")
            
            # If no subdirectories exist, use the main folder as a single category
            if not categories:
                categories = ["All Rooms"]
                sample_rooms_by_category["All Rooms"] = []
                
                for img_path in glob.glob(f"{sample_room_path}/*.jpg") + glob.glob(f"{sample_room_path}/*.png"):
                    # Convert to relative path for the template
                    relative_path = img_path.replace("\\", "/")  # Handle Windows paths
                    sample_rooms_by_category["All Rooms"].append(relative_path)
                    
                print(f"All Rooms: {len(sample_rooms_by_category['All Rooms'])} images")
            else:
                # Process each category folder
                for category in categories:
                    category_path = os.path.join(sample_room_path, category)
                    sample_rooms_by_category[category] = []
                    
                    for img_path in glob.glob(f"{category_path}/*.jpg") + glob.glob(f"{category_path}/*.png"):
                        # Convert to relative path for the template
                        relative_path = img_path.replace("\\", "/")  # Handle Windows paths
                        sample_rooms_by_category[category].append(relative_path)
                    
                    print(f"Category {category}: {len(sample_rooms_by_category[category])} images")
    
    # For visitors, limit materials to 4 (one from each category)
    if not current_user:
        # Group tiles by material type
        tiles_by_type = {}
        for tile in all_tiles:
            material_type = tile.material
            if material_type not in tiles_by_type:
                tiles_by_type[material_type] = []
            tiles_by_type[material_type].append(tile)
        
        # Select one tile from each category
        limited_tiles = []
        for material_type, tiles in tiles_by_type.items():
            if tiles:
                limited_tiles.append(tiles[0])  # Add the first tile of each type
        
        tiles = limited_tiles
    else:
        tiles = all_tiles
    
    accessory_categories = get_accessory_categories(db)
    
    # Prepare the response context
    context = {
        "request": request, 
        "room": None,
        "images": tiles,
        "accessories": accessories,
        "accessory_categories": accessory_categories, 
        "user": current_user,
        "enterprise": enterprise,
        "enterprise_user": enterprise_user,
        "sample_rooms_by_category": sample_rooms_by_category,
        "sample_room_categories": list(sample_rooms_by_category.keys()),
        "sample_room": sample_room,
        "enterprise_3d_rooms": enterprise_3d_rooms,
    }
    
    print(f"Template context: sample_room={sample_room}, sample_room_categories={context['sample_room_categories']}")
    
    return templates.TemplateResponse("room_visualization_index.html", context)


# --------------------------CART ROUTES----------------------------

@app.get("/cart", response_class=HTMLResponse)
async def cart_page(request: Request, current_user = Depends(get_user_for_template), enterprise = Depends(get_enterprise)):
    return templates.TemplateResponse("cart.html", {"request": request, "user": current_user, "enterprise": enterprise})


# --------------------------AUTH ROUTES----------------------------
@app.get("/login")
async def login_page(request: Request, enterprise = Depends(get_enterprise)):
    return templates.TemplateResponse("login.html", {"request": request, "enterprise": enterprise})

@app.post("/login", name="login_user_route")
async def login(
    request: Request, 
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    try:
        # Find the user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logging.warning(f"Login attempt for non-existent user: {email}")
            return templates.TemplateResponse(
                "login.html", 
                {"request": request, "error": "Invalid email or password"}
            )
        
        # Verify password
        if not verify_password(password, user.password_hash):
            logging.warning(f"Failed password verification for user: {email}")
            return templates.TemplateResponse(
                "login.html", 
                {"request": request, "error": "Invalid email or password"}
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        
        logging.debug(f"Created access token for user {user.id}")
        
        # If we're in an enterprise context, check if user is associated with this enterprise
        if enterprise:
            enterprise_user = db.query(EnterpriseUser).filter(
                EnterpriseUser.enterprise_id == enterprise.id,
                EnterpriseUser.user_id == user.id
            ).first()
            
            if not enterprise_user:
                # Let's Automatically associate them if the User is not associated with this enterprise 
                logging.info(f"Automatically associating user {user.id} with enterprise {enterprise.id} upon login")
                new_enterprise_user = EnterpriseUser(
                    enterprise_id=enterprise.id,
                    user_id=user.id,
                    role="user"  # Default role
                )
                db.add(new_enterprise_user)
                db.commit()
        
        # Create a response with the cookie
        response = RedirectResponse(url="/my_projects", status_code=303)

        logging.debug(f"About to set cookie: access_token={access_token[:10]}...")

        # Set cookie directly on the response
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=int(access_token_expires.total_seconds()),
            path="/",  # Set the cookie for the entire site
            samesite="lax"
        )
        logging.debug(f"Cookie set on response: {response.headers.get('set-cookie', 'Not found')}")
        logging.debug("Set access_token cookie and redirecting")
        return response
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return templates.TemplateResponse(
            "login.html", 
            {"request": request, "error": f"An error occurred during login: {str(e)}"}
        )

@app.get("/register")
async def register_page(request: Request, enterprise = Depends(get_enterprise)):
    return templates.TemplateResponse("register.html", {"request": request, "enterprise": enterprise})

@app.post("/register")
async def register_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    role: str = Form("customer"),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    if password != confirm_password:
        return templates.TemplateResponse(
            "register.html", 
            {"request": request, "error": "Passwords do not match"}
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        if existing_user.email == email:
            return templates.TemplateResponse(
                "register.html", 
                {"request": request, "error": "An account with this email already exists"}
            )
        else:
            return templates.TemplateResponse(
                "register.html", 
                {"request": request, "error": "This username is already taken"}
            )
    
    try:
        # Create new user
        hashed_password = get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_password,
            role=role
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)  # Refresh to get the ID
        
        # If registering through an enterprise portal, associate with that enterprise
        if enterprise:
            logging.info(f"Associating new user {new_user.id} with enterprise {enterprise.id}")
            enterprise_user = EnterpriseUser(
                enterprise_id=enterprise.id,
                user_id=new_user.id,
                role="user"  # Default role for self-registration
            )
            db.add(enterprise_user)
            db.commit()
        
        # Redirect to login page with success message
        return RedirectResponse(
            url="/login?registered=true", 
            status_code=303
        )
    except Exception as e:
        db.rollback()
        logging.error(f"Registration error: {str(e)}")
        return templates.TemplateResponse(
            "register.html", 
            {"request": request, "error": "Registration failed. Please try again."}
        )

@app.get("/reset-password")
async def reset_password_page(request: Request, enterprise = Depends(get_enterprise)):
    return templates.TemplateResponse("reset_password.html", {"request": request, "enterprise": enterprise})

@app.post("/reset-password")
async def reset_password(
    request: Request,
    email: str = Form(...),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    # Find the user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return templates.TemplateResponse(
            "reset_password.html", 
            {"request": request, "error": "No account found with that email address.", "enterprise": enterprise}
        )
    
    # In a real application, you would:
    # 1. Generate a reset token
    # 2. Send an email with a reset link
    # 3. Create a page to handle the reset
    
    # For this example, we'll just show a success message
    return templates.TemplateResponse(
        "reset_password.html", 
        {"request": request, "success": "If an account exists with that email, a password reset link will be sent.", "enterprise": enterprise}
    )

@app.get("/profile")
async def profile_page(request: Request, current_user = Depends(get_current_user), enterprise = Depends(get_enterprise)):
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
        
    return templates.TemplateResponse("profile.html", {
        "request": request,
        "user": current_user,
        "enterprise": enterprise
    })


# @app.get("/my-projects")
# async def my_projects_page(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
#     if not current_user:
#         return RedirectResponse(url="/login", status_code=303)
    
#     # Get the user's saved projects
#     projects = db.query(RoomDesign).filter(RoomDesign.user_id == current_user.id).all()
    
#     return templates.TemplateResponse("my_projects.html", {
#         "request": request,
#         "user": current_user,
#         "projects": projects
#     })
@app.get("/my_projects", response_class=HTMLResponse)
async def my_projects(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), enterprise = Depends(get_enterprise)):
    # No need to check if user is logged in - the dependency will handle that
    
    # Get projects
    projects = db.query(RoomDesign).filter(RoomDesign.user_id == current_user.id).order_by(RoomDesign.created_at.desc()).all()
    
    return templates.TemplateResponse(
        "my_projects.html",
        {"request": request, "user": current_user, "projects": projects, "enterprise": enterprise}
    )

@app.get("/project/{project_id}", response_class=HTMLResponse)
async def view_project(
    project_id: int, 
    request: Request, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    # Get project
    project = db.query(RoomDesign).filter(
        RoomDesign.id == project_id,
        RoomDesign.user_id == current_user.id
    ).first()
    
    if not project:
        return RedirectResponse(url="/my_projects")
    
    # Get tile if available
    tile = None
    if project.tile_id:
        tile = db.query(Tile).filter(Tile.id == project.tile_id).first()
    
    # Get previous and next projects
    prev_project = db.query(RoomDesign).filter(
        RoomDesign.user_id == current_user.id,
        RoomDesign.id < project_id
    ).order_by(RoomDesign.id.desc()).first()
    
    next_project = db.query(RoomDesign).filter(
        RoomDesign.user_id == current_user.id,
        RoomDesign.id > project_id
    ).order_by(RoomDesign.id.asc()).first()
    
    return templates.TemplateResponse(
        "view_project.html",
        {
            "request": request, 
            "user": current_user, 
            "project": project, 
            "tile": tile,
            "prev_project": prev_project,
            "next_project": next_project,
            "enterprise": enterprise
        }
    )


@app.get("/debug")
async def debug_page(request: Request, current_user = Depends(get_user_for_template)):
    """Debug page to check authentication state."""
    logging.debug(f"Debug page accessed, user: {current_user}")
    return templates.TemplateResponse("debug.html", {"request": request, "user": current_user})
   
@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get the project
    project = db.query(RoomDesign).filter(RoomDesign.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if the project belongs to the user
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    # Delete the project
    db.delete(project)
    db.commit()
    
    return {"status": "success"}

@app.get("/logout")
async def logout(request: Request):
    """Log out the current user by deleting the access token cookie."""
    logging.debug("Logout route accessed")
    
    # Create a response for redirection
    response = RedirectResponse(url="/", status_code=303)
    
    # Delete the access_token cookie
    response.delete_cookie(
        key="access_token",
        path="/",  # Important: must match the path used when setting the cookie
        domain=None,  # Use None to match the domain used when setting
        secure=False,  # Match the secure setting used when setting
        httponly=True  # Match the httponly setting used when setting
    )
    
    logging.debug("Access token cookie deleted")
    
    return response

# --------------------------END AUTH ROUTES----------------------------         

# --------------------------ADMIN ----------------------------

# Admin middleware to check if user is a superadmin
def superadmin_required(func: Callable):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request = kwargs.get('request')
        current_user = kwargs.get('current_user')
        
        if not current_user:
            return RedirectResponse(url="/login", status_code=303)
        
        if current_user.role != "superadmin":
            return templates.TemplateResponse("error.html", {
                "request": request,
                "user": current_user,
                "error_code": 403,
                "error_message": "You don't have permission to access this page."
            })
        
        return await func(*args, **kwargs)
    
    return wrapper

# Admin routes
# @app.get("/admin/materials")
# async def admin_materials(
#     request: Request, 
#     current_user = Depends(get_current_user),
#     page: int = 1,
#     db: Session = Depends(get_db)
# ):
#     # Check if user is superadmin
#     if not current_user:
#         return RedirectResponse(url="/login", status_code=303)
    
#     if current_user.role != "superadmin":
#         return templates.TemplateResponse("error.html", {
#             "request": request,
#             "user": current_user,
#             "error_code": 403,
#             "error_message": "You don't have permission to access this page."
#         })
    
#     # Get materials with pagination
#     page_size = 10
#     offset = (page - 1) * page_size
    
#     materials = db.query(Tile).offset(offset).limit(page_size).all()
#     total_materials = db.query(Tile).count()
#     total_pages = max(1, (total_materials + page_size - 1) // page_size)
    
#     return templates.TemplateResponse("admin/materials.html", {
#         "request": request,
#         "user": current_user,
#         "materials": materials,
#         "page": page,
#         "total_pages": total_pages,
#         "active_page": "materials"
#     })

@app.post("/process_sample_room")
async def process_sample_room(request: Request):
    try:
        form = await request.form()
        sample_path = form.get("sample_path")
        
        if not sample_path:
            raise HTTPException(status_code=400, detail="No sample path provided")
        
        # Convert URL path to file system path
        # Remove leading slash if present
        if sample_path.startswith('/'):
            sample_path = sample_path[1:]
        
        # Check if the file exists
        if not os.path.exists(sample_path):
            return {"state": "error", "message": f"File not found: {sample_path}"}
        
        # Load the sample image
        with Image.open(sample_path) as op_img:
            op_img = np.asarray(op_img)
            
            if op_img.shape[0] > 600:
                op_img = image_resize(op_img, height=600)
            
            op_img = Image.fromarray(op_img)
            
            # Generate unique filenames
            unique_room_image = IMG_FOLDER+generate_unique_filename("room", ".jpg")
            unique_textured_room_path = IMG_FOLDER+generate_unique_filename("textured_room", ".jpg")
            unique_mask_path = DATA_FOLDER+generate_unique_filename("image_mask", ".npy")
            unique_corners_path = DATA_FOLDER+generate_unique_filename("corners_estimation", ".npy")
            
            # Save the sample image and a copy for processing
            op_img.save(unique_room_image)
            op_img.save(unique_textured_room_path)
            
            # Store file paths globally
            file_paths.update({
                "room_image": unique_room_image,
                "textured_room_path": unique_textured_room_path,
                "mask_path": unique_mask_path,
                "corners_path": unique_corners_path,
            })
        
        # Perform wall segmentation and estimation
        mask1 = wall_segmenting(model, unique_room_image)
        estimation_map = wall_estimation(unique_room_image)
        
        # Get wall corners and create the final mask
        corners = get_wall_corners(estimation_map)
        mask2 = np.zeros(mask1.shape, dtype=np.uint8)
        for pts in corners:
            cv2.fillPoly(mask2, [np.array(pts)], color=(255, 0, 0))
        
        mask = mask1 & np.bool_(mask2)
        
        # Save the mask and corners data
        np.save(unique_mask_path, mask)
        np.save(unique_corners_path, np.array(corners))
        
        return {"state": "success", "room_image": unique_room_image}
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"state": "error", "message": str(e)}


# --------------------------END HTML PAGES----------------------------
@app.post("/room_visualization_prediction")
async def predict_image_room(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        with Image.open(io.BytesIO(contents)) as op_img:
            op_img = np.asarray(op_img)

            if op_img.shape[0] > 600:
                op_img = image_resize(op_img, height=600)

            op_img = Image.fromarray(op_img)

            # Generate unique filenames
            unique_room_image = IMG_FOLDER+generate_unique_filename("room", ".jpg")
            unique_textured_room_path = IMG_FOLDER+generate_unique_filename("textured_room", ".jpg")
            unique_mask_path = DATA_FOLDER+generate_unique_filename("image_mask", ".npy")
            unique_corners_path = DATA_FOLDER+generate_unique_filename("corners_estimation", ".npy")

            # Save the uploaded image and a copy for processing
            op_img.save(unique_room_image)
            op_img.save(unique_textured_room_path)

            # Store file paths globally (you can refactor this to use better state management)
            file_paths.update({
                "room_image": unique_room_image,
                "textured_room_path": unique_textured_room_path,
                "mask_path": unique_mask_path,
                "corners_path": unique_corners_path,
            })

        # Perform wall segmentation and estimation
        mask1 = wall_segmenting(model, unique_room_image)
        estimation_map = wall_estimation(unique_room_image)

        # Get wall corners and create the final mask
        corners = get_wall_corners(estimation_map)
        mask2 = np.zeros(mask1.shape, dtype=np.uint8)
        for pts in corners:
            cv2.fillPoly(mask2, [np.array(pts)], color=(255, 0, 0))

        mask = mask1 & np.bool_(mask2)

        # Save the mask and corners data
        np.save(unique_mask_path, mask)
        np.save(unique_corners_path, np.array(corners))
        
        return {"state": "success", "room_image": unique_room_image, "textured_room_path": unique_textured_room_path}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/apply_texture/{image:path}")
async def apply_texture(image: str):
    try:
        # Load the previously stored paths
        room_image = file_paths.get("room_image")
        mask_path = file_paths.get("mask_path")
        corners_path = file_paths.get("corners_path")
        textured_room_path = file_paths.get("textured_room_path")

        if not all([room_image, mask_path, corners_path, textured_room_path]):
            raise HTTPException(status_code=400, detail="Required file paths are missing.")

        img = load_img(room_image)

        # Load computed vertices of a wall and segmentation mask of room walls
        corners = np.load(corners_path, allow_pickle=True)
        mask = np.load(mask_path, allow_pickle=True)

        # Load and apply the selected texture
        # texture_path = os.path.join("static", "test_images", "textures", image)
        # texture_path = os.path.join("static", "tiles", image)
        texture_path = image
        texture = load_texture(texture_path, 6, 6)
        img_textured = map_texture(texture, img, corners, mask)

        # Transfer shadows and highlights from the original image
        out = brightness_transfer(img, img_textured, mask)

        # Save the processed image
        save_image(out, textured_room_path)

        return JSONResponse(content={"state": "success", "room_path": textured_room_path})

    except Exception as e:
        return JSONResponse(content={"state": "error", "message": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9090)

    
router = APIRouter()

@app.get("/api/3d-models")
async def list_3d_models(
    request: Request,
    category: str = None, 
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """List all 3D model accessories from the database with enterprise filtering"""
    try:
        from database.models import Accessory
        
        # Apply enterprise filtering logic (same as in room_visualization_index)
        if enterprise:
            # Enterprise context: get enterprise-specific + public accessories
            enterprise_accessories = db.query(Accessory).options(joinedload(Accessory.accessory_category)).filter(
                Accessory.enterprise_id == enterprise.id,
                Accessory.is_approved == True
            ).all()
            
            # Get public accessories (available to all)
            public_accessories = db.query(Accessory).options(joinedload(Accessory.accessory_category)).filter(
                Accessory.is_public == True,
                Accessory.is_approved == True
            ).all()
            
            # Combine and deduplicate
            all_accessories = enterprise_accessories + public_accessories
            seen_ids = set()
            filtered_accessories = []
            for acc in all_accessories:
                if acc.id not in seen_ids:
                    filtered_accessories.append(acc)
                    seen_ids.add(acc.id)
        else:
            # Public context: only show public accessories
            filtered_accessories = db.query(Accessory).options(joinedload(Accessory.accessory_category)).filter(
                Accessory.is_public == True,
                Accessory.is_approved == True
            ).all()
        
        # Apply category filter if specified
        if category:
            accessories = [acc for acc in filtered_accessories if acc.accessory_category and acc.accessory_category.name == category]
        else:
            accessories = filtered_accessories
            
        models = []
        for accessory in accessories:
            model_info = {
                "id": accessory.id,
                "name": accessory.name,
                "path": accessory.model_path,
                "category": accessory.accessory_category.name if accessory.accessory_category else "other",
                "category_display": accessory.accessory_category.display_name if accessory.accessory_category else "Other",
                "thumbnail": accessory.thumbnail_path or "/static/img/accessories/placeholder.jpg",
                "price": float(accessory.price) if accessory.price else 0.0,
                "manufacturer": accessory.manufacturer,
                "description": accessory.description,
                "available_colors": accessory.available_colors or [],
                "default_color": accessory.default_color,
                "installation_difficulty": accessory.installation_difficulty,
                "style_category": accessory.style_category,
                "dimensions": {
                    "length_cm": accessory.length_cm,
                    "width_cm": accessory.width_cm,
                    "height_cm": accessory.height_cm
                }
            }
            models.append(model_info)
        
        return JSONResponse(content={"models": models})
    except Exception as e:
        import traceback
        print(f"Error in /api/3d-models: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(content={"error": str(e)}, status_code=500)


def get_model_category(filename):
    """Determine category based on filename"""
    filename = filename.lower()
    
    if any(keyword in filename for keyword in ["bath", "tub"]):
        return "bathtubs"
    elif any(keyword in filename for keyword in ["sink", "basin", "lavatory"]):
        return "sinks"
    elif any(keyword in filename for keyword in ["toilet", "wc"]):
        return "toilets"
    elif any(keyword in filename for keyword in ["shower"]):
        return "shower-boxes"
    elif any(keyword in filename for keyword in ["cabinet", "vanity", "storage"]):
        return "cabinets"
    elif any(keyword in filename for keyword in ["mirror"]):
        return "mirrors"
    elif any(keyword in filename for keyword in ["light", "lamp", "sconce"]):
        return "lighting"
    else:
        return "other"

def get_accessory_categories(db: Session):
    """Get active accessory categories"""
    return db.query(AccessoryCategory).filter(
        AccessoryCategory.active == True
    ).order_by(AccessoryCategory.sort_order).all()
