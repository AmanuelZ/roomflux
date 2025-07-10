from fastapi import APIRouter, Request, Depends, HTTPException, Form, UploadFile, File, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session, joinedload
from database.database import get_db
from database.models import User, Tile, TechnicalSpec, Category, Order, OrderItem, ShippingAddress, Enterprise, EnterpriseUser, EnterpriseMaterial, Accessory, AccessoryCategory
from typing import Optional, List
import os
import uuid
import math
from auth.dependencies import get_current_user
from utils.helpers import format_order_status
from auth.auth import get_password_hash
import time

router = APIRouter(prefix="/admin")
templates = Jinja2Templates(directory="templates")


@router.get("/materials", response_class=HTMLResponse)
async def admin_materials(
    request: Request, 
    current_user = Depends(get_current_user),
    page: int = Query(1, ge=1),
    items_per_page: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Admin page for managing materials with pagination"""
    # Check if user is authenticated and is an admin
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)

    # Calculate offset for pagination
    offset = (page - 1) * items_per_page
    
    # Get total count of tiles
    total_tiles = db.query(Tile).count()
    
    # Calculate total pages
    total_pages = math.ceil(total_tiles / items_per_page)
    
    # Get tiles for current page
    tiles = db.query(Tile).options(
        joinedload(Tile.enterprise)
    ).offset(offset).limit(items_per_page).all()
    
    # Get all accessories (both public and enterprise-specific) with category relationship
    accessories = db.query(Accessory).options(
        joinedload(Accessory.enterprise),
        joinedload(Accessory.accessory_category)
    ).all()
    
    # Get pending enterprise materials that are not public
    pending_materials_query = db.query(
        Tile.id,
        Tile.name,
        Tile.material,
        Tile.image_path,
        Tile.price_per_sqm,
        Enterprise.name.label('enterprise_name'),
        EnterpriseMaterial.visible
    ).join(
        EnterpriseMaterial, EnterpriseMaterial.tile_id == Tile.id
    ).join(
        Enterprise, Enterprise.id == EnterpriseMaterial.enterprise_id
    )

    # Get all enterprise materials
    pending_materials = pending_materials_query.all()
    
    # Get pending enterprise accessories that are not approved - FIXED VERSION
    pending_accessories_query = db.query(
        Accessory.id,
        Accessory.name,
        AccessoryCategory.display_name.label('category_name'),  # Use category relationship
        Accessory.thumbnail_path,
        Accessory.price,
        Enterprise.name.label('enterprise_name'),
        Accessory.is_approved,
        Accessory.is_public
    ).outerjoin(
        Enterprise, Enterprise.id == Accessory.enterprise_id
    ).outerjoin(
        AccessoryCategory, AccessoryCategory.id == Accessory.category_id  # Join with categories table
    ).filter(
        Accessory.is_approved == False  # Show unapproved accessories
    )
    
    # Get all enterprise materials and accessories
    pending_materials = pending_materials_query.all()
    pending_accessories = pending_accessories_query.all()
    
    # Get accessory categories for the form
    accessory_categories = db.query(AccessoryCategory).filter(
        AccessoryCategory.active == True
    ).order_by(AccessoryCategory.sort_order).all()
    
    return templates.TemplateResponse("admin/materials.html", {
        "request": request,
        "tiles": tiles,
        "materials": tiles,
        "pending_materials": pending_materials,
        "pending_accessories": pending_accessories,
        "accessories": accessories,
        "accessory_categories": accessory_categories,
        "page": page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "active_page": "materials",
        "user": current_user 
    })


@router.post("/materials/approve/{material_id}")
async def approve_material(
    material_id: int,
    make_public: bool = Form(True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Approve an enterprise material and optionally make it public"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the enterprise material
    enterprise_material = db.query(EnterpriseMaterial).filter(
        EnterpriseMaterial.tile_id == material_id
    ).first()
    
    if not enterprise_material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Update visibility status
    enterprise_material.visible = True
    # enterprise_material.is_public = make_public
    
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.post("/accessories/approve/{accessory_id}")
async def approve_accessory(
    accessory_id: int,
    make_public: bool = Form(False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Approve an enterprise accessory and optionally make it public"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the accessory
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    # Update approval and public status
    accessory.is_approved = True
    accessory.is_public = make_public
    
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.post("/accessories/reject/{accessory_id}")
async def reject_accessory(
    accessory_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject an enterprise accessory"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the accessory
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    # Delete the accessory (or you could just mark it as rejected)
    db.delete(accessory)
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.post("/accessories/toggle-public/{accessory_id}")
async def toggle_accessory_public(
    accessory_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle whether an accessory is public (available to all enterprises)"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the accessory
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    # Toggle public status
    accessory.is_public = not accessory.is_public
    
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.post("/accessories/delete")
async def delete_accessory(
    request: Request,
    current_user = Depends(get_current_user),
    accessory_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Delete an accessory and its associated data"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the accessory
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    try:
        # If the accessory has files, delete them from the filesystem
        if accessory.model_path and not accessory.model_path.startswith('#'):
            try:
                file_path = accessory.model_path.lstrip('/')
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error deleting model file: {str(e)}")
        
        if accessory.thumbnail_path and not accessory.thumbnail_path.startswith('#'):
            try:
                file_path = accessory.thumbnail_path.lstrip('/')
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error deleting thumbnail file: {str(e)}")
        
        # Delete the accessory
        db.delete(accessory)
        db.commit()
        
        return RedirectResponse(url="/admin/materials", status_code=303)
    
    except Exception as e:
        db.rollback()
        return templates.TemplateResponse("admin/materials.html", {
            "request": request,
            "user": current_user,
            "error_message": f"Error deleting accessory: {str(e)}",
            "active_page": "materials"
        })


@router.post("/materials/reject/{material_id}")
async def reject_enterprise_material(
    material_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject an enterprise material"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the enterprise material
    enterprise_material = db.query(EnterpriseMaterial).filter(
        EnterpriseMaterial.id == material_id
    ).first()
    
    if not enterprise_material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Delete the enterprise material association
    db.delete(enterprise_material)
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.post("/materials/toggle-visibility/{material_id}")
async def toggle_material_visibility(
    material_id: int,
    make_public: bool = Form(False),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle whether a material is public (available on main site)"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the enterprise material by tile_id
    enterprise_material = db.query(EnterpriseMaterial).filter(
        EnterpriseMaterial.tile_id == material_id
    ).first()
    
    if not enterprise_material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Update visibility status
    enterprise_material.visible = make_public
    
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.post("/materials/toggle-public/{material_id}")
async def toggle_material_public(
    material_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle whether a material is public (available on main site)"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the material
    material = db.query(Tile).filter(Tile.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Toggle public status
    material.is_public = not material.is_public
    
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.get("/materials/edit/{tile_id}", response_class=HTMLResponse)
async def edit_material(
    request: Request, 
    tile_id: int,
    current_user = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Edit a specific material"""
    # Check if user is authenticated and is an admin
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    tile = db.query(Tile).filter(Tile.id == tile_id).first()
    if not tile:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Get technical specs if they exist
    tech_specs = db.query(TechnicalSpec).filter(TechnicalSpec.tile_id == tile_id).first()
    
    return templates.TemplateResponse("admin/edit_material.html", {
        "request": request,
        "tile": tile,
        "tech_specs": tech_specs,
        "active_page": "materials",
        "user": current_user 
    })

@router.post("/materials/edit/{tile_id}", response_class=HTMLResponse)
async def update_material(
    request: Request,
    tile_id: int,
    name: str = Form(...),
    material: str = Form(...),
    price_per_sqm: float = Form(...),
    size_width: Optional[str] = Form(None),
    size_height: Optional[str] = Form(None),
    manufacturer: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Update a material"""
    tile = db.query(Tile).filter(Tile.id == tile_id).first()
    if not tile:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Update basic tile information
    tile.name = name
    tile.material = material
    tile.price_per_sqm = price_per_sqm
    tile.manufacturer = manufacturer
    tile.description = description
    
    # Handle dimensions based on material type
    try:
        width = float(size_width) if size_width and size_width.strip() else None
        height = float(size_height) if size_height and size_height.strip() else None
        
        if material in ['tile', 'wallpaper', 'flooring'] and not (width and height):
            raise HTTPException(status_code=400, detail=f"Size dimensions are required for {material}")
        
        tile.width = width if width else 0
        tile.height = height if height else 0
    except ValueError:
        raise HTTPException(status_code=400, detail="Size dimensions must be valid numbers")
    
    # Handle image upload if provided
    if image and image.filename:
        # Create a unique filename
        _, ext = os.path.splitext(image.filename)
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Make sure the directory exists
        os.makedirs("static/tiles", exist_ok=True)
        
        # Set the file location
        file_location = f"static/tiles/{unique_filename}"
        image_url = f"/static/tiles/{unique_filename}"
        
        # Save the file
        with open(file_location, "wb+") as file_object:
            file_object.write(await image.read())
        
        # Update the image path
        tile.image_path = image_url
    
    # Save changes
    db.commit()
    
    return RedirectResponse(url="/admin/materials", status_code=303)

@router.get("/accessories/edit/{accessory_id}", response_class=HTMLResponse)
async def edit_accessory(
    request: Request, 
    accessory_id: int,
    current_user = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Edit a specific accessory"""
    # Check if user is authenticated and is an admin
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    accessory_categories = db.query(AccessoryCategory).all()
    if not accessory_categories:
        raise HTTPException(status_code=404, detail="Accessory categories not found")
    
    # Get all enterprises for the dropdown
    enterprises = db.query(Enterprise).all()
    
    return templates.TemplateResponse("admin/edit_accessory.html", {
        "request": request,
        "accessory": accessory,
        "enterprises": enterprises,
        "accessory_categories": accessory_categories,
        "active_page": "materials",
        "user": current_user 
    })

@router.post("/accessories/edit/{accessory_id}", response_class=HTMLResponse)
async def update_accessory(
    request: Request,
    accessory_id: int,
    name: str = Form(...),
    category_id: str = Form(...),
    manufacturer: str = Form(...),
    description: str = Form(None),
    price: float = Form(...),
    length_cm: float = Form(...),
    width_cm: float = Form(...),
    height_cm: float = Form(...),
    volume_liters: Optional[float] = Form(None),
    weight_kg: Optional[float] = Form(None),
    material_type: Optional[str] = Form(None),
    default_color: str = Form(...),
    installation_difficulty: str = Form(...),
    style_category: Optional[str] = Form(None),
    enterprise_id: Optional[int] = Form(None),
    is_approved: bool = Form(False),
    is_public: bool = Form(False),
    model_file: Optional[UploadFile] = File(None),
    thumbnail_image: Optional[UploadFile] = File(None),
    additional_colors: List[str] = Form([]),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an accessory"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    try:
        # Handle colors - combine default color with additional colors
        combined_colors = [default_color]
        if additional_colors:
            # Filter out empty values and duplicates
            filtered_additional = [color for color in additional_colors if color and color != default_color]
            combined_colors.extend(filtered_additional)
        
        # Update basic accessory information
        accessory.name = name
        accessory.category_id = category_id
        accessory.manufacturer = manufacturer
        accessory.description = description
        accessory.price = price
        accessory.length_cm = length_cm
        accessory.width_cm = width_cm
        accessory.height_cm = height_cm
        accessory.volume_liters = volume_liters
        accessory.weight_kg = weight_kg
        accessory.material_type = material_type
        accessory.available_colors = combined_colors  # Use the correct variable name
        accessory.default_color = default_color
        accessory.installation_difficulty = installation_difficulty
        accessory.style_category = style_category
        accessory.enterprise_id = enterprise_id if enterprise_id else None
        accessory.is_approved = is_approved
        accessory.is_public = is_public
        
        # Auto-calculate volume if not provided
        if volume_liters is None:
            accessory.volume_liters = (length_cm * width_cm * height_cm) / 1000  # Convert cm³ to liters
        
        # Handle model file upload if provided
        if model_file and model_file.filename:
            # Create directories if they don't exist
            os.makedirs("static/accessories/models", exist_ok=True)
            
            # Generate unique filename
            model_extension = os.path.splitext(model_file.filename)[1]
            model_filename = f"model_{int(time.time())}_{str(uuid.uuid4())}{model_extension}"
            model_path = f"static/accessories/models/{model_filename}"
            
            # Delete old model file if it exists
            if accessory.model_path and os.path.exists(accessory.model_path.lstrip('/')):
                try:
                    os.remove(accessory.model_path.lstrip('/'))
                except Exception as e:
                    print(f"Error deleting old model file: {e}")
            
            # Save new model file
            with open(model_path, "wb") as buffer:
                content = await model_file.read()
                buffer.write(content)
            
            # Update model path and type
            accessory.model_path = f"/{model_path}"
            accessory.model_type = model_extension.lower().replace('.', '')
        
        # Handle thumbnail upload if provided
        if thumbnail_image and thumbnail_image.filename:
            # Create directories if they don't exist
            os.makedirs("static/accessories/thumbnails", exist_ok=True)
            
            # Generate unique filename
            thumbnail_extension = os.path.splitext(thumbnail_image.filename)[1]
            thumbnail_filename = f"thumbnail_{int(time.time())}_{str(uuid.uuid4())}{thumbnail_extension}"
            thumbnail_path = f"static/accessories/thumbnails/{thumbnail_filename}"
            
            # Delete old thumbnail file if it exists
            if accessory.thumbnail_path and os.path.exists(accessory.thumbnail_path.lstrip('/')):
                try:
                    os.remove(accessory.thumbnail_path.lstrip('/'))
                except Exception as e:
                    print(f"Error deleting old thumbnail file: {e}")
            
            # Save new thumbnail file
            with open(thumbnail_path, "wb") as buffer:
                content = await thumbnail_image.read()
                buffer.write(content)
            
            # Update thumbnail path
            accessory.thumbnail_path = f"/{thumbnail_path}"
        
        # Save changes
        db.commit()
        db.refresh(accessory)
        
        return RedirectResponse(url="/admin/materials", status_code=303)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating accessory: {str(e)}")

@router.get("/accessory-categories", response_class=HTMLResponse)
async def manage_accessory_categories(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manage accessory categories"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    categories = db.query(AccessoryCategory).order_by(AccessoryCategory.sort_order).all()
    
    return templates.TemplateResponse("admin/accessory_categories.html", {
        "request": request,
        "categories": categories,
        "active_page": "categories",
        "user": current_user
    })

@router.post("/accessory-categories/create")
async def create_accessory_category(
    name: str = Form(...),
    display_name: str = Form(...),
    description: str = Form(None),
    icon: str = Form(None),
    sort_order: int = Form(0),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new accessory category"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if category already exists
    existing = db.query(AccessoryCategory).filter(AccessoryCategory.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category = AccessoryCategory(
        name=name,
        display_name=display_name,
        description=description,
        icon=icon,
        sort_order=sort_order
    )
    
    db.add(category)
    db.commit()
    
    return RedirectResponse(url="/admin/accessory-categories", status_code=303)

@router.post("/accessory-categories/edit/{category_id}")
async def update_accessory_category(
    category_id: int,
    name: str = Form(...),
    display_name: str = Form(...),
    description: str = Form(None),
    icon: str = Form(None),
    sort_order: int = Form(0),
    active: bool = Form(False),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an accessory category"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    category = db.query(AccessoryCategory).filter(AccessoryCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category.name = name
    category.display_name = display_name
    category.description = description
    category.icon = icon
    category.sort_order = sort_order
    category.active = active
    
    db.commit()
    
    return RedirectResponse(url="/admin/accessory-categories", status_code=303)


@router.get("/orders")
async def admin_orders(
    request: Request,
    current_user = Depends(get_current_user),
    page: int = 1,
    items_per_page: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Admin orders page"""
    # Check if user is superadmin
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    if current_user.role != "superadmin":
        return templates.TemplateResponse("error.html", {
            "request": request,
            "user": current_user,
            "error_code": 403,
            "error_message": "You don't have permission to access this page."
        })
    
    # Calculate offset for pagination
    offset = (page - 1) * items_per_page
    
    # Get total count of orders
    total_orders = db.query(Order).count()
    
    # Calculate total pages
    total_pages = math.ceil(total_orders / items_per_page)
    
    # Get orders for current page
    orders = db.query(Order).order_by(Order.created_at.desc()).offset(offset).limit(items_per_page).all()
    
    return templates.TemplateResponse("admin/orders.html", {
        "request": request,
        "orders": orders,
        "page": page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "active_page": "orders",
        "user": current_user,
        "format_order_status": format_order_status
    })

@router.get("/orders/{order_id}")
async def admin_order_detail(
    order_id: int,
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin order detail page"""
    # Check if user is authenticated and is an admin
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    if current_user.role != "superadmin":
        return templates.TemplateResponse("error.html", {
            "request": request,
            "user": current_user,
            "error_code": 403,
            "error_message": "You don't have permission to access this page."
        })
    
    # Get the order
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get order items
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    
    # Get shipping address
    shipping_address = db.query(ShippingAddress).filter(ShippingAddress.id == order.shipping_address_id).first()
    
    # Format items with tile and accessory details - UPDATED SECTION
    formatted_items = []
    for item in order_items:
        if item.tile_id:
            # This is a tile/material
            tile = db.query(Tile).filter(Tile.id == item.tile_id).first()
            if tile:
                formatted_items.append({
                    "id": item.id,
                    "item_type": "tile",
                    "item_id": item.tile_id,
                    "name": tile.name,
                    "image_path": tile.image_path,
                    "price": item.price_at_purchase,
                    "quantity": item.quantity,
                    "subtotal": item.price_at_purchase * item.quantity
                })
        elif item.accessory_id:
            # This is an accessory
            accessory = db.query(Accessory).filter(Accessory.id == item.accessory_id).first()
            if accessory:
                formatted_items.append({
                    "id": item.id,
                    "item_type": "accessory",
                    "item_id": item.accessory_id,
                    "name": accessory.name,
                    "image_path": accessory.thumbnail_path,
                    "price": item.price_at_purchase,
                    "quantity": item.quantity,
                    "subtotal": item.price_at_purchase * item.quantity
                })
    
    return templates.TemplateResponse("admin/order_detail.html", {
        "request": request,
        "user": current_user,
        "order": order,
        "items": formatted_items,  # Use formatted_items instead of the old structure
        "shipping_address": shipping_address,
        "active_page": "orders",
        "format_order_status": format_order_status
    })


@router.post("/orders/{order_id}/update-status")
async def update_order_status(
    order_id: int,
    status: str = Form(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order status (admin only)"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order status
    order.status = status
    db.commit()
    
    return RedirectResponse(url=f"/admin/orders/{order_id}", status_code=303)


# Admin routes
@router.get("/users")
async def admin_users(
    request: Request, 
    current_user = Depends(get_current_user),
    page: int = Query(1, ge=1),
    items_per_page: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    # Check if user is superadmin
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    if current_user.role != "superadmin":
        return templates.TemplateResponse("error.html", {
            "request": request,
            "user": current_user,
            "error_code": 403,
            "error_message": "You don't have permission to access this page."
        })
    
    # Calculate offset for pagination
    offset = (page - 1) * items_per_page
    
    # Get total count of users
    total_users = db.query(User).count()
    
    # Calculate total pages
    total_pages = math.ceil(total_users / items_per_page)
    
    # Get users for current page with their enterprise associations
    # Make sure to use joinedload to load the enterprise_users relationship
    users = db.query(User).options(
        joinedload(User.enterprise_users).joinedload(EnterpriseUser.enterprise)
    ).order_by(User.id).offset(offset).limit(items_per_page).all()
    
    # Get all enterprises for the dropdown
    enterprises = db.query(Enterprise).all()
    
    return templates.TemplateResponse("admin/users.html", {
        "request": request,
        "user": current_user,
        "current_user": current_user,
        "users": users,
        "enterprises": enterprises,
        "page": page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "active_page": "users"
    })

# API endpoints for user management
@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }

@router.post("/users/add")
async def add_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        return templates.TemplateResponse("admin/users.html", {
            "request": request,
            "user": current_user,
            "users": db.query(User).all(),
            "enterprises": db.query(Enterprise).all(),
            "error_message": "Username or email already exists",
            "active_page": "users"
        })
    
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
    
    return RedirectResponse(url="/admin/users", status_code=303)

@router.post("/users/edit")
async def edit_user(
    request: Request,
    user_id: int = Form(...),
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(None),
    role: str = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if username or email already exists for another user
    existing_user = db.query(User).filter(
        ((User.username == username) | (User.email == email)),
        User.id != user_id
    ).first()
    
    if existing_user:
        return templates.TemplateResponse("admin/users.html", {
            "request": request,
            "user": current_user,
            "users": db.query(User).all(),
            "enterprises": db.query(Enterprise).all(),
            "error_message": "Username or email already exists",
            "active_page": "users"
        })
    
    # Update user
    user.username = username
    user.email = email
    user.role = role
    
    # Update password if provided
    if password:
        user.password_hash = get_password_hash(password)
    
    db.commit()
    
    return RedirectResponse(url="/admin/users", status_code=303)

@router.post("/users/delete")
async def delete_user(
    request: Request,
    user_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Delete the user
    db.delete(user)
    db.commit()
    
    return RedirectResponse(url="/admin/users", status_code=303)

@router.post("/users/add-to-enterprise")
async def add_user_to_enterprise(
    request: Request,
    user_id: int = Form(...),
    enterprise_id: int = Form(...),
    role: str = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate role
    if role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if enterprise exists
    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    # Check if user is already in this enterprise
    existing = db.query(EnterpriseUser).filter(
        EnterpriseUser.user_id == user_id,
        EnterpriseUser.enterprise_id == enterprise_id
    ).first()
    
    if existing:
        # Update role if already exists
        existing.role = role
    else:
        # Add user to enterprise
        enterprise_user = EnterpriseUser(
            user_id=user_id,
            enterprise_id=enterprise_id,
            role=role
        )
        db.add(enterprise_user)
    
    db.commit()
    
    return RedirectResponse(url="/admin/users", status_code=303)

@router.post("/users/remove-from-enterprise")
async def remove_user_from_enterprise(
    request: Request,
    user_id: int = Form(...),
    enterprise_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the enterprise user record
    enterprise_user = db.query(EnterpriseUser).filter(
        EnterpriseUser.user_id == user_id,
        EnterpriseUser.enterprise_id == enterprise_id
    ).first()
    
    if not enterprise_user:
        raise HTTPException(status_code=404, detail="User not found in this enterprise")
    
    # Remove the user from the enterprise
    db.delete(enterprise_user)
    db.commit()
    
    return RedirectResponse(url="/admin/users", status_code=303)

# Material management endpoints
@router.post("/materials/delete")
async def delete_material(
    request: Request,
    current_user = Depends(get_current_user),
    material_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Delete a material and its associated data"""
    # Check if user is superadmin
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the material
    material = db.query(Tile).filter(Tile.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    try:
        # Delete associated technical specs first (to avoid foreign key constraint errors)
        db.query(TechnicalSpec).filter(TechnicalSpec.tile_id == material_id).delete()
        
        # If the material has an image file, delete it from the filesystem
        if material.image_path and not material.image_path.startswith('#'):
            try:
                # Remove the leading slash if present
                file_path = material.image_path.lstrip('/')
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logging.info(f"Deleted image file: {file_path}")
            except Exception as e:
                # Log the error but continue with the deletion
                logging.error(f"Error deleting image file: {str(e)}")
        
        # Delete the material
        db.delete(material)
        db.commit()
        
        return RedirectResponse(url="/admin/materials", status_code=303)
    
    except Exception as e:
        db.rollback()
        logging.error(f"Error deleting material: {str(e)}")
        return templates.TemplateResponse("admin/materials.html", {
            "request": request,
            "user": current_user,
            "error_message": f"Error deleting material: {str(e)}",
            "materials": db.query(Tile).all(),
            "active_page": "materials"
        })

# Enterprise routes
@router.get("/enterprises")
async def admin_enterprises(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or not current_user.has_role('superadmin'):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all enterprises
    enterprises = db.query(Enterprise).all()
    
    return templates.TemplateResponse("admin/enterprises.html", {
        "request": request,
        "enterprises": enterprises,
        "user": current_user
    })

@router.get("/enterprises/new")
async def new_enterprise(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or not current_user.has_role('superadmin'):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return templates.TemplateResponse("admin/edit_enterprise.html", {
        "request": request,
        "enterprise": None,
        "user": current_user
    })

@router.post("/enterprises/new")
async def create_enterprise(
    request: Request,
    name: str = Form(...),
    subdomain: str = Form(...),
    custom_domain: Optional[str] = Form(None),
    primary_color: Optional[str] = Form(None),
    secondary_color: Optional[str] = Form(None),
    contact_email: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or not current_user.has_role('superadmin'):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Clean and validate subdomain
    subdomain = subdomain.strip().lower()
    # Remove any special characters and spaces
    subdomain = ''.join(c for c in subdomain if c.isalnum())
    
    # Check if subdomain is already taken
    existing = db.query(Enterprise).filter(Enterprise.subdomain == subdomain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already in use")
    
    # Process logo if provided
    logo_path = None
    if logo and logo.filename:
        # Create unique filename
        _, ext = os.path.splitext(logo.filename)
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Ensure directory exists
        os.makedirs("static/enterprise_logos", exist_ok=True)
        
        # Save file
        file_location = f"static/enterprise_logos/{unique_filename}"
        logo_path = f"/static/enterprise_logos/{unique_filename}"
        
        contents = await logo.read()
        with open(file_location, "wb") as file_object:
            file_object.write(contents)
    
    # Create enterprise
    enterprise = Enterprise(
        name=name,
        subdomain=subdomain,
        custom_domain=custom_domain,
        primary_color=primary_color,
        secondary_color=secondary_color,
        contact_email=contact_email,
        logo_path=logo_path,
        active=True
    )
    
    db.add(enterprise)
    db.commit()
    
    # Log the created enterprise
    print(f"Created enterprise: {name}, subdomain: {subdomain}")
    print(f"Access URL: http://{subdomain}.roomflux.com/")
    
    return RedirectResponse(url="/admin/enterprises", status_code=303)

@router.get("/debug/enterprise")
async def debug_enterprise_detection(
    request: Request,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check enterprise detection"""
    host = request.headers.get("host", "")
    
    # Check for subdomain format
    subdomain = None
    if ".roomflux.com" in host:
        subdomain = host.split(".roomflux.com")[0]
    
    # Check for enterprise in database
    enterprise = None
    if subdomain:
        enterprise = db.query(Enterprise).filter(
            Enterprise.subdomain == subdomain,
            Enterprise.active == True
        ).first()
    
    # Check for custom domain
    custom_domain_enterprise = db.query(Enterprise).filter(
        Enterprise.custom_domain == host,
        Enterprise.active == True
    ).first()
    
    # Get all enterprises for comparison
    all_enterprises = db.query(Enterprise).all()
    
    return {
        "host": host,
        "detected_subdomain": subdomain,
        "enterprise_found_by_subdomain": {
            "id": enterprise.id,
            "name": enterprise.name,
            "subdomain": enterprise.subdomain
        } if enterprise else None,
        "enterprise_found_by_custom_domain": {
            "id": custom_domain_enterprise.id,
            "name": custom_domain_enterprise.name,
            "custom_domain": custom_domain_enterprise.custom_domain
        } if custom_domain_enterprise else None,
        "all_enterprises": [
            {
                "id": e.id,
                "name": e.name,
                "subdomain": e.subdomain,
                "custom_domain": e.custom_domain
            } for e in all_enterprises
        ]
    }

@router.get("/enterprises/{enterprise_id}/edit")
async def edit_enterprise(
    request: Request,
    enterprise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or not current_user.has_role('superadmin'):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get enterprise
    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    return templates.TemplateResponse("admin/edit_enterprise.html", {
        "request": request,
        "enterprise": enterprise,
        "user": current_user
    })

@router.post("/enterprises/{enterprise_id}/edit")
async def update_enterprise(
    request: Request,
    enterprise_id: int,
    name: str = Form(...),
    subdomain: str = Form(...),
    custom_domain: Optional[str] = Form(None),
    primary_color: Optional[str] = Form(None),
    secondary_color: Optional[str] = Form(None),
    contact_email: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or not current_user.has_role('superadmin'):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get enterprise
    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    # Check if subdomain is already taken by another enterprise
    existing = db.query(Enterprise).filter(
        Enterprise.subdomain == subdomain,
        Enterprise.id != enterprise_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subdomain already in use")
    
    # Process logo if provided
    if logo and logo.filename:
        # Create unique filename
        _, ext = os.path.splitext(logo.filename)
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        
        # Ensure directory exists
        os.makedirs("static/enterprise_logos", exist_ok=True)
        
        # Save file
        file_location = f"static/enterprise_logos/{unique_filename}"
        logo_path = f"/static/enterprise_logos/{unique_filename}"
        
        contents = await logo.read()
        with open(file_location, "wb") as file_object:
            file_object.write(contents)
        
        # Update logo path
        enterprise.logo_path = logo_path
    
    # Update enterprise
    enterprise.name = name
    enterprise.subdomain = subdomain
    enterprise.custom_domain = custom_domain
    enterprise.primary_color = primary_color
    enterprise.secondary_color = secondary_color
    enterprise.contact_email = contact_email
    
    db.commit()
    
    return RedirectResponse(url="/admin/enterprises", status_code=303)

@router.post("/enterprises/{enterprise_id}/delete")
async def delete_enterprise(
    request: Request,
    enterprise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user is superadmin
    if not current_user or not current_user.has_role('superadmin'):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get enterprise
    enterprise = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    if not enterprise:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    
    # Delete enterprise
    db.delete(enterprise)
    db.commit()
    
    return RedirectResponse(url="/admin/enterprises", status_code=303)


