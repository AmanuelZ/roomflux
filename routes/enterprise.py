from fastapi import APIRouter, Depends, HTTPException, Request, Form, File, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
from database.database import get_db
from database.models import Enterprise, EnterpriseMaterial, EnterpriseSampleRoom, EnterpriseUser, Tile, User, Category, TechnicalSpec
from auth.auth import get_current_user
from enterprise import get_enterprise, get_enterprise_user
import logging
logger = logging.getLogger("enterprise")

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Helper function to check if user is enterprise admin
def is_enterprise_admin(user: User, enterprise_id: int, db: Session):
    if not user:
        return False
    
    # Superadmins can manage all enterprises
    if user.has_role('superadmin'):
        return True
    
    # Check if user is an admin for this enterprise
    enterprise_user = db.query(EnterpriseUser).filter(
        EnterpriseUser.user_id == user.id,
        EnterpriseUser.enterprise_id == enterprise_id,
        EnterpriseUser.role == 'admin'
    ).first()
    
    return enterprise_user is not None

# Enterprise settings page
@router.get("/enterprise/settings")
async def enterprise_settings(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    logger.info(f"Enterprise settings requested. Enterprise: {enterprise}")
    
    if not enterprise:
        # Redirect to main page or show error
        return templates.TemplateResponse("error.html", {
            "request": request,
            "error_message": "No enterprise context found. Please access via your enterprise subdomain.",
            "user": current_user
        }, status_code=404)
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return templates.TemplateResponse("enterprise/settings.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user,
        "enterprise_user": enterprise_user
    })

# Update enterprise settings
@router.post("/enterprise/settings")
async def update_enterprise_settings(
    request: Request,
    logo: UploadFile = File(None),
    name: str = Form(...),
    contact_email: str = Form(None),
    primary_color: str = Form(None),
    secondary_color: str = Form(None),
    website: str = Form(None),
    phone: str = Form(None),
    address: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    # Check permissions
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Use the helper function for authorization check
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update enterprise fields
    enterprise.name = name
    enterprise.contact_email = contact_email
    enterprise.primary_color = primary_color
    enterprise.secondary_color = secondary_color
    enterprise.website = website
    enterprise.phone = phone
    enterprise.address = address
    
    # Handle logo upload if provided
    if logo and logo.filename:
        # Create directory if it doesn't exist
        os.makedirs("static/enterprise_logos", exist_ok=True)
        
        # Generate a unique filename
        file_extension = os.path.splitext(logo.filename)[1]
        unique_filename = f"enterprise_{enterprise.id}_{uuid.uuid4()}{file_extension}"
        file_path = os.path.join("static/enterprise_logos", unique_filename)
        
        # Save the file
        contents = await logo.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Update the logo path in the database
        enterprise.logo_path = f"/{file_path}"
    
    # Save changes
    db.commit()
    
    return RedirectResponse(url="/enterprise/settings", status_code=303)


# Enterprise materials management
@router.get("/enterprise/materials")
async def enterprise_materials(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get materials for this enterprise with their visibility status
    # First, get all tiles directly associated with this enterprise
    enterprise_tiles = db.query(Tile).filter(
        Tile.enterprise_id == enterprise.id
    ).all()
    
    # Then, get all tiles associated through EnterpriseMaterial
    enterprise_materials = db.query(EnterpriseMaterial).filter(
        EnterpriseMaterial.enterprise_id == enterprise.id
    ).all()
    
    # Create a mapping of tile_id to visibility status
    visibility_map = {em.tile_id: em.visible for em in enterprise_materials}
    
    # Get the tile objects for enterprise materials
    enterprise_material_tiles = []
    for em in enterprise_materials:
        tile = db.query(Tile).filter(Tile.id == em.tile_id).first()
        if tile:
            # Add visibility information to the tile object
            tile.visible = em.visible
            enterprise_material_tiles.append(tile)
    
    # For tiles directly associated with enterprise (without EnterpriseMaterial),
    # set visibility based on is_public attribute or default to False
    for tile in enterprise_tiles:
        if tile.id not in visibility_map:
            # If there's no EnterpriseMaterial record, check if the tile is public
            tile.visible = getattr(tile, 'is_public', False)
    
    # Combine both sets of tiles, avoiding duplicates
    all_tile_ids = set()
    materials = []
    
    # Add enterprise material tiles first
    for tile in enterprise_material_tiles:
        if tile.id not in all_tile_ids:
            all_tile_ids.add(tile.id)
            materials.append(tile)
    
    # Then add direct enterprise tiles if not already added
    for tile in enterprise_tiles:
        if tile.id not in all_tile_ids:
            all_tile_ids.add(tile.id)
            materials.append(tile)
    
    return templates.TemplateResponse("enterprise/materials.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user,
        "materials": materials,
        "active_page": "materials",
        "enterprise_user": enterprise_user
    })

@router.get("/enterprise/materials/add")
async def add_enterprise_material_form(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get categories for dropdown
    categories = db.query(Category).all()
    
    return templates.TemplateResponse("enterprise/add_material.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user,
        "categories": categories,
        "active_page": "materials",
        "enterprise_user": enterprise_user
    })

@router.post("/enterprise/materials/add")
async def add_enterprise_material(
    request: Request,
    name: str = Form(...),
    material: str = Form(...),  
    price_per_sqm: float = Form(...),
    tile_width: Optional[float] = Form(None),
    tile_height: Optional[float] = Form(None),
    wallpaper_width: Optional[float] = Form(None),
    wallpaper_height: Optional[float] = Form(None),
    flooring_width: Optional[float] = Form(None),
    flooring_height: Optional[float] = Form(None),
    color_code: Optional[str] = Form(None),
    paint_finish: Optional[str] = Form(None),
    paint_type: Optional[str] = Form(None), 
    material_composition: Optional[str] = Form(None),
    finish_type: Optional[str] = Form(None),
    manufacturer: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise: Enterprise = Depends(get_enterprise)
):
    # Handle different material types
    width = None
    height = None
    
    if material == 'tile':
        width = tile_width
        height = tile_height
    elif material == 'wallpaper':
        width = wallpaper_width
        height = wallpaper_height
    elif material == 'flooring':
        width = flooring_width
        height = flooring_height
    
    # Save image for non-paint materials or textured paint
    image_url = None
    if image and (material != 'paint' or (material == 'paint' and paint_type == 'textured')):
        # Create a unique filename
        import uuid
        import os
        from datetime import datetime
        
        # Get file extension
        _, ext = os.path.splitext(image.filename)
        
        # Create a unique filename
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Make sure the directory exists
        os.makedirs("static/tiles", exist_ok=True)
        
        # Set the file location with the unique filename
        file_location = f"static/tiles/{unique_filename}"
        image_url = f"/static/tiles/{unique_filename}"
        
        # Save the file
        with open(file_location, "wb+") as file_object:
            file_object.write(image.file.read())
    
    # For solid paint, use color code as the "image"
    if material == 'paint' and paint_type == 'solid':
        image_url = f"#{color_code}"
    
    # Create tile with appropriate fields
    tile = Tile(
        name=name,
        material=material, 
        price_per_sqm=price_per_sqm,
        width=width if width else 0,
        height=height if height else 0,
        image_path=image_url,
        manufacturer=manufacturer,
        description=description,
        stock_status=True,
        enterprise_id=enterprise.id
    )

    db.add(tile)
    db.commit()
    db.refresh(tile)

    # Add technical specs based on material type
    if material == 'tile':
        specs = TechnicalSpec(
            water_resistance=0.8,
            slip_rating="R9",
            frost_resistant=True,
            indoor_outdoor="indoor",
            pei_rating=4,
            material=material,
            finish_type=finish_type,
            tile_id=tile.id
        )
    elif material == 'paint':
        specs = TechnicalSpec(
            paint_finish=paint_finish,
            voc_content="Low",
            coverage_area=10,
            drying_time=4,
            tile_id=tile.id
        )
    elif material == 'wallpaper':
        specs = TechnicalSpec(
            pattern_repeat=64,
            washable=True,
            removable=True,
            tile_id=tile.id
        )
    else:  # flooring
        specs = TechnicalSpec(
            water_resistance=0.9,
            slip_rating="R10",
            wear_layer=0.5,
            tile_id=tile.id
        )
    
    db.add(specs)
    
    # Create enterprise material association
    enterprise_material = EnterpriseMaterial(
        enterprise_id=enterprise.id,
        tile_id=tile.id,
        visible=False
    )
    
    db.add(enterprise_material)
    db.commit()
    
    return RedirectResponse(url="/enterprise/materials", status_code=303)

@router.get("/enterprise/materials/edit/{material_id}")
async def edit_enterprise_material_form(
    material_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the material
    material = db.query(Tile).filter(
        Tile.id == material_id,
        Tile.enterprise_id == enterprise.id
    ).first()
    
     # If not found, try to get it through EnterpriseMaterial
    if not material:
        enterprise_material = db.query(EnterpriseMaterial).filter(
            EnterpriseMaterial.tile_id == material_id,
            EnterpriseMaterial.enterprise_id == enterprise.id
        ).first()
        
        if enterprise_material:
            material = db.query(Tile).filter(Tile.id == enterprise_material.tile_id).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Get technical specs
    tech_specs = db.query(TechnicalSpec).filter(TechnicalSpec.tile_id == material_id).first()
    
    return templates.TemplateResponse("enterprise/edit_material.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user,
        "material": material,
        "tech_specs": tech_specs,
        "enterprise_user": enterprise_user
    })

@router.post("/enterprise/materials/update/{material_id}")
async def update_enterprise_material(
    material_id: int,
    name: str = Form(...),
    material: str = Form(...),
    price_per_sqm: float = Form(...),
    manufacturer: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    # Get the material
    # First try to get it directly
    tile = db.query(Tile).filter(
        Tile.id == material_id,
        Tile.enterprise_id == enterprise.id
    ).first()
    
    # If not found, try to get it through EnterpriseMaterial
    enterprise_material = None
    if not tile:
        enterprise_material = db.query(EnterpriseMaterial).filter(
            EnterpriseMaterial.tile_id == material_id,
            EnterpriseMaterial.enterprise_id == enterprise.id
        ).first()
        
        if enterprise_material:
            tile = db.query(Tile).filter(Tile.id == enterprise_material.tile_id).first()
    
    if not tile:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Update the material
    tile.name = name
    tile.material = material
    tile.price_per_sqm = price_per_sqm
    tile.manufacturer = manufacturer
    tile.description = description
    
    # If there's an enterprise material association, update custom fields
    if enterprise_material:
        enterprise_material.custom_name = name
        enterprise_material.custom_price = price_per_sqm
        enterprise_material.custom_description = description
    
    # Handle image upload if provided
    if image and image.filename:
        # Save the new image
        _, ext = os.path.splitext(image.filename)
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Make sure the directory exists
        os.makedirs("static/tiles", exist_ok=True)
        
        # Set the file location with the unique filename
        file_location = f"static/tiles/{unique_filename}"
        image_url = f"/static/tiles/{unique_filename}"
        
        # Save the file
        contents = await image.read()
        with open(file_location, "wb") as file_object:
            file_object.write(contents)
        
        # Update the image path
        tile.image_path = image_url
    
    db.commit()
    
    return RedirectResponse(url="/enterprise/materials", status_code=303)


@router.post("/enterprise/materials/add-from-global")
async def add_material_from_global(
    request: Request,
    tile_id: int = Form(...),
    custom_name: Optional[str] = Form(None),
    custom_price: Optional[float] = Form(None),
    custom_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the original tile
    original_tile = db.query(Tile).filter(Tile.id == tile_id).first()
    if not original_tile:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Create a copy for the enterprise
    new_tile = Tile(
        name=custom_name if custom_name else original_tile.name,
        material=original_tile.material,
        price_per_sqm=custom_price if custom_price is not None else original_tile.price_per_sqm,
        width=original_tile.width,
        height=original_tile.height,
        image_path=original_tile.image_path,
        manufacturer=original_tile.manufacturer,
        description=custom_description if custom_description else original_tile.description,
        stock_status=True,
        enterprise_id=enterprise.id,
        is_approved=True,  # Auto-approved since it's from global catalog
        is_public=False    # Only available to this enterprise
    )
    
    db.add(new_tile)
    db.commit()
    db.refresh(new_tile)
    
    # Copy technical specs if they exist
    original_specs = db.query(TechnicalSpec).filter(TechnicalSpec.tile_id == original_tile.id).first()
    if original_specs:
        new_specs = TechnicalSpec(
            tile_id=new_tile.id,
            water_resistance=original_specs.water_resistance,
            slip_rating=original_specs.slip_rating,
            frost_resistant=original_specs.frost_resistant,
            indoor_outdoor=original_specs.indoor_outdoor,
            pei_rating=original_specs.pei_rating,
            paint_finish=original_specs.paint_finish,
            voc_content=original_specs.voc_content,
            coverage_area=original_specs.coverage_area,
            drying_time=original_specs.drying_time,
            pattern_repeat=original_specs.pattern_repeat,
            washable=original_specs.washable,
            removable=original_specs.removable,
            wear_layer=original_specs.wear_layer
        )
        db.add(new_specs)
        db.commit()
    
    return RedirectResponse(url="/enterprise/materials", status_code=303)

@router.post("/enterprise/materials/delete")
async def delete_enterprise_material(
    request: Request,
    material_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the material and verify it belongs to this enterprise
    material = db.query(Tile).filter(
        Tile.id == material_id,
        Tile.enterprise_id == enterprise.id
    ).first()
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found or not owned by this enterprise")
    
    # Delete associated technical specs
    db.query(TechnicalSpec).filter(TechnicalSpec.tile_id == material_id).delete()
    
    # Delete the material
    db.delete(material)
    db.commit()
    
    return RedirectResponse(url="/enterprise/materials", status_code=303)

# Enterprise sample rooms management
@router.get("/enterprise/sample-rooms")
async def enterprise_sample_rooms(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get enterprise sample rooms
    sample_rooms = db.query(EnterpriseSampleRoom).filter(
        EnterpriseSampleRoom.enterprise_id == enterprise.id
    ).all()
    
    return templates.TemplateResponse("enterprise/sample_rooms.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user,
        "sample_rooms": sample_rooms,
        "enterprise_user": enterprise_user
    })

# Add or update sample room
@router.post("/enterprise/sample-rooms/update")
async def update_sample_room(
    request: Request,
    category: str = Form(...),
    name: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")

    if not name:
        name = f"{category.replace('_', ' ').title()} Sample"
    
    # Process image
    if image and image.filename:
        # Create unique filename
        _, ext = os.path.splitext(image.filename)
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Ensure directory exists
        os.makedirs("static/enterprise_sample_rooms", exist_ok=True)
        
        # Save file
        file_location = f"static/enterprise_sample_rooms/{unique_filename}"
        image_path = f"/static/enterprise_sample_rooms/{unique_filename}"
        
        contents = await image.read()
        with open(file_location, "wb") as file_object:
            file_object.write(contents)
        
        # Check if sample room already exists for this category
        sample_room = db.query(EnterpriseSampleRoom).filter(
            EnterpriseSampleRoom.enterprise_id == enterprise.id,
            EnterpriseSampleRoom.category == category
        ).first()
        
        if sample_room:
            # Update existing sample room
            sample_room.image_path = image_path
        else:
            # Create new sample room
            sample_room = EnterpriseSampleRoom(
                enterprise_id=enterprise.id,
                category=category,
                image_path=image_path,
                name=name
            )
            db.add(sample_room)
        
        db.commit()
    
    return RedirectResponse(url="/enterprise/sample-rooms", status_code=303)

# Delete sample room
@router.post("/enterprise/sample-rooms/delete")
async def delete_sample_room(
    request: Request,
    sample_room_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find the sample room
    sample_room = db.query(EnterpriseSampleRoom).filter(
        EnterpriseSampleRoom.id == sample_room_id,
        EnterpriseSampleRoom.enterprise_id == enterprise.id
    ).first()
    
    if not sample_room:
        raise HTTPException(status_code=404, detail="Sample room not found")
    
    # Delete the sample room
    db.delete(sample_room)
    db.commit()
    
    return RedirectResponse(url="/enterprise/sample-rooms", status_code=303)

# Enterprise users management
@router.get("/enterprise/users")
async def enterprise_users(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get enterprise users
    enterprise_users = db.query(EnterpriseUser).filter(
        EnterpriseUser.enterprise_id == enterprise.id
    ).all()
    
    # Create a set of user IDs that are already associated with this enterprise
    enterprise_user_ids = {eu.user_id for eu in enterprise_users}
    
    return templates.TemplateResponse("enterprise/users.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user,
        "enterprise_users": enterprise_users,
        "enterprise_user_ids": enterprise_user_ids,
        "enterprise_user": enterprise_user
    })

# Add user to enterprise
@router.post("/enterprise/users/add")
async def add_enterprise_user(
    request: Request,
    user_id: int = Form(...),
    role: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already associated with this enterprise
    existing = db.query(EnterpriseUser).filter(
        EnterpriseUser.enterprise_id == enterprise.id,
        EnterpriseUser.user_id == user_id
    ).first()
    
    if existing:
        # Update existing association
        existing.role = role
    else:
        # Create new association
        enterprise_user = EnterpriseUser(
            enterprise_id=enterprise.id,
            user_id=user_id,
            role=role
        )
        db.add(enterprise_user)
    
    db.commit()
    
    return RedirectResponse(url="/enterprise/users", status_code=303)

# Remove user from enterprise
@router.post("/enterprise/users/remove")
async def remove_enterprise_user(
    request: Request,
    user_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Find the association
    enterprise_user = db.query(EnterpriseUser).filter(
        EnterpriseUser.enterprise_id == enterprise.id,
        EnterpriseUser.user_id == user_id
    ).first()
    
    if not enterprise_user:
        raise HTTPException(status_code=404, detail="User not found in enterprise")
    
    # Don't allow removing yourself if you're the only admin
    if enterprise_user.user_id == current_user.id and enterprise_user.role == 'admin':
        # Check if there are other admins
        other_admins = db.query(EnterpriseUser).filter(
            EnterpriseUser.enterprise_id == enterprise.id,
            EnterpriseUser.user_id != current_user.id,
            EnterpriseUser.role == 'admin'
        ).count()
        
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot remove yourself as the only admin")
    
    # Delete the association
    db.delete(enterprise_user)
    db.commit()
    
    return RedirectResponse(url="/enterprise/users", status_code=303)

@router.post("/enterprise/users/{user_id}/update-role")
async def update_enterprise_user_role(
    request: Request,
    user_id: int,
    role: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    enterprise = Depends(get_enterprise)
):
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    # Check if current user is an admin for this enterprise
    if not is_enterprise_admin(current_user, enterprise.id, db):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate role
    if role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Get the enterprise user record
    enterprise_user = db.query(EnterpriseUser).filter(
        EnterpriseUser.enterprise_id == enterprise.id,
        EnterpriseUser.user_id == user_id
    ).first()
    
    if not enterprise_user:
        raise HTTPException(status_code=404, detail="User not found in this enterprise")
    
    # Update the role
    enterprise_user.role = role
    db.commit()
    
    # Redirect back to the users page
    return RedirectResponse(url="/enterprise/users", status_code=303)

# Add these imports at the top
from database.models import Enterprise3DRoom
import os
import uuid
from PIL import Image
import shutil

# Add these routes to your existing enterprise.py

@router.get("/enterprise/3d-rooms")
async def enterprise_3d_rooms_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    """Enterprise 3D rooms management page"""
    
    if not current_user:
        return RedirectResponse(url="/login", status_code=302)
    
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not enterprise_user or enterprise_user.role not in ["admin", "owner"]:
        if current_user.role != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get enterprise 3D rooms
    enterprise_3d_rooms = db.query(Enterprise3DRoom).filter(
        Enterprise3DRoom.enterprise_id == enterprise.id,
        Enterprise3DRoom.is_active == True
    ).all()
    
    return templates.TemplateResponse("enterprise/3d_rooms.html", {
        "request": request,
        "user": current_user,
        "enterprise": enterprise,
        "enterprise_user": enterprise_user,
        "enterprise_3d_rooms": enterprise_3d_rooms
    })

@router.post("/enterprise/3d-rooms/upload")
async def upload_enterprise_3d_room_form(
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
    """Upload 3D room via form submission"""
    
    if not current_user:
        return RedirectResponse(url="/login", status_code=302)
    
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
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
        
        return RedirectResponse(url="/enterprise/3d-rooms?success=uploaded", status_code=302)
        
    except Exception as e:
        db.rollback()
        print(f"Error uploading 3D room: {str(e)}")
        return RedirectResponse(url="/enterprise/3d-rooms?error=upload_failed", status_code=302)

@router.post("/enterprise/3d-rooms/delete")
async def delete_enterprise_3d_room_form(
    request: Request,
    room_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    enterprise = Depends(get_enterprise),
    enterprise_user = Depends(get_enterprise_user)
):
    """Delete 3D room via form submission"""
    
    if not current_user:
        return RedirectResponse(url="/login", status_code=302)
    
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    if not enterprise_user or enterprise_user.role not in ["admin", "owner"]:
        if current_user.role != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get the room
    room = db.query(Enterprise3DRoom).filter(
        Enterprise3DRoom.id == room_id,
        Enterprise3DRoom.enterprise_id == enterprise.id
    ).first()
    
    if not room:
        return RedirectResponse(url="/enterprise/3d-rooms?error=room_not_found", status_code=302)
    
    try:
        # Delete files
        if os.path.exists(room.thumbnail_path.lstrip('/')):
            os.remove(room.thumbnail_path.lstrip('/'))
        
        if os.path.exists(room.model_path.lstrip('/')):
            os.remove(room.model_path.lstrip('/'))
        
        # Delete database record
        db.delete(room)
        db.commit()
        
        return RedirectResponse(url="/enterprise/3d-rooms?success=deleted", status_code=302)
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting 3D room: {str(e)}")
        return RedirectResponse(url="/enterprise/3d-rooms?error=delete_failed", status_code=302)
