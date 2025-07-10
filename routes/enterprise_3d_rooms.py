from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Enterprise3DRoom, Enterprise, EnterpriseUser
from enterprise import get_enterprise, get_enterprise_user
from auth.dependencies import get_current_user
import os
import uuid
from PIL import Image
import shutil

router = APIRouter()

# Default 3D rooms (same as your existing default rooms)
DEFAULT_3D_ROOMS = [
    {
        "id": "bathroom",
        "name": "Bathroom",
        "category": "bathroom",
        "thumbnail": "/static/3drooms/Bathroom/bathroom.jpg",
        "model_path": "/static/3drooms/Bathroom/bathroom.gltf",
        "is_default": True
    },
    {
        "id": "kitchen", 
        "name": "Kitchen",
        "category": "kitchen",
        "thumbnail": "/static/3drooms/Kitchen/kitchen.jpg",
        "model_path": "/static/3drooms/Kitchen/kitchen.gltf",
        "is_default": True
    },
    {
        "id": "living-room",
        "name": "Living Room", 
        "category": "living_room",
        "thumbnail": "/static/3drooms/Living Room/living-room.jpg",
        "model_path": "/static/3drooms/Living Room/living-room.gltf",
        "is_default": True
    },
    {
        "id": "bedroom",
        "name": "Bedroom",
        "category": "bedroom", 
        "thumbnail": "/static/3drooms/Bedroom/bedroom.jpg",
        "model_path": "/static/3drooms/Bedroom/bedroom.gltf",
        "is_default": True
    }
]

@router.get("/api/enterprise/3d-rooms")
async def get_enterprise_3d_rooms(
    request: Request,
    enterprise_param: str = Query(None, alias="enterprise"),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """Get 3D rooms for current enterprise context"""
    try:
        # Try to get enterprise from multiple sources
        current_enterprise = enterprise
        
        # If no enterprise from dependency, try from query parameter
        if not current_enterprise and enterprise_param:
            current_enterprise = db.query(Enterprise).filter(
                Enterprise.subdomain == enterprise_param
            ).first()
        
        # Also check X-Enterprise header
        if not current_enterprise:
            enterprise_header = request.headers.get("X-Enterprise")
            if enterprise_header:
                current_enterprise = db.query(Enterprise).filter(
                    Enterprise.subdomain == enterprise_header
                ).first()
        
        print(f"Enterprise detection result: {current_enterprise.subdomain if current_enterprise else 'None'}")
        
        if current_enterprise:
            # Get enterprise-specific 3D rooms
            enterprise_rooms = db.query(Enterprise3DRoom).filter(
                Enterprise3DRoom.enterprise_id == current_enterprise.id,
                Enterprise3DRoom.is_active == True
            ).all()
            
            print(f"Found {len(enterprise_rooms)} enterprise rooms")
            
            rooms = []
            for room in enterprise_rooms:
                rooms.append({
                    "id": str(room.id),
                    "name": room.name,
                    "category": room.category,
                    "thumbnail": room.thumbnail_path,
                    "model_path": room.model_path,
                    "description": room.description,
                    "is_default": False
                })
            
            # If no enterprise rooms, return defaults
            if not rooms:
                print("No enterprise rooms found, returning defaults")
                rooms = DEFAULT_3D_ROOMS
                
        else:
            # Main site - return default rooms
            print("No enterprise context, returning default rooms")
            rooms = DEFAULT_3D_ROOMS
        
        return JSONResponse(content={"rooms": rooms})
        
    except Exception as e:
        print(f"Error getting 3D rooms: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"rooms": DEFAULT_3D_ROOMS})


@router.post("/api/enterprise/3d-rooms/upload")
async def upload_enterprise_3d_room(
    request: Request,
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(None),
    thumbnail: UploadFile = File(...),
    model: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    """Upload a new 3D room for enterprise"""
    
    # Check permissions
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not enterprise:
        raise HTTPException(status_code=400, detail="Enterprise context required")
    
    # Check if user is admin of this enterprise
    if not enterprise_user or enterprise_user.role not in ["admin", "owner"]:
        if current_user.role != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Create directories
        enterprise_3d_dir = f"static/enterprise_3d_rooms/{enterprise.id}"
        os.makedirs(enterprise_3d_dir, exist_ok=True)
        
        # Save thumbnail
        thumbnail_ext = os.path.splitext(thumbnail.filename)[1]
        thumbnail_filename = f"{uuid.uuid4().hex}{thumbnail_ext}"
        thumbnail_path = os.path.join(enterprise_3d_dir, thumbnail_filename)
        
        with open(thumbnail_path, "wb") as buffer:
            shutil.copyfileobj(thumbnail.file, buffer)
        
        # Resize thumbnail if needed
        with Image.open(thumbnail_path) as img:
            if img.width > 400 or img.height > 300:
                img.thumbnail((400, 300), Image.Resampling.LANCZOS)
                img.save(thumbnail_path)
        
        # Save 3D model
        model_ext = os.path.splitext(model.filename)[1]
        model_filename = f"{uuid.uuid4().hex}{model_ext}"
        model_path = os.path.join(enterprise_3d_dir, model_filename)
        
        with open(model_path, "wb") as buffer:
            shutil.copyfileobj(model.file, buffer)
        
        # Create database record
        new_room = Enterprise3DRoom(
            enterprise_id=enterprise.id,
            name=name,
            category=category,
            model_path=f"/{model_path}",
            thumbnail_path=f"/{thumbnail_path}",
            description=description,
            is_active=True
        )
        
        db.add(new_room)
        db.commit()
        db.refresh(new_room)
        
        return JSONResponse(content={
            "success": True,
            "message": "3D room uploaded successfully",
            "room_id": new_room.id
        })
        
    except Exception as e:
        db.rollback()
        print(f"Error uploading 3D room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.delete("/api/enterprise/3d-rooms/{room_id}")
async def delete_enterprise_3d_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    """Delete a 3D room"""
    
    # Check permissions
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not enterprise:
        raise HTTPException(status_code=400, detail="Enterprise context required")
    
    if not enterprise_user or enterprise_user.role not in ["admin", "owner"]:
        if current_user.role != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get the room
    room = db.query(Enterprise3DRoom).filter(
        Enterprise3DRoom.id == room_id,
        Enterprise3DRoom.enterprise_id == enterprise.id
    ).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="3D room not found")
    
    try:
        # Delete files
        if os.path.exists(room.thumbnail_path.lstrip('/')):
            os.remove(room.thumbnail_path.lstrip('/'))
        
        if os.path.exists(room.model_path.lstrip('/')):
            os.remove(room.model_path.lstrip('/'))
        
        # Delete database record
        db.delete(room)
        db.commit()
        
        return JSONResponse(content={
            "success": True,
            "message": "3D room deleted successfully"
        })
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting 3D room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
