from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Accessory, AccessoryCategory
from auth.dependencies import get_current_user
import os
import uuid
import time
import json
from typing import List, Optional

router = APIRouter()

def generate_unique_filename(base_name, extension):
    timestamp = int(time.time())
    unique_id = str(uuid.uuid4())
    return f"{base_name}_{timestamp}_{unique_id}{extension}"

@router.post("/")
async def create_accessory(
    name: str = Form(...),
    category: str = Form(...),
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
    additional_colors: Optional[str] = Form(None),  # JSON string of color array
    installation_difficulty: str = Form(...),
    style_category: Optional[str] = Form(None),
    model_file: UploadFile = File(...),
    mtl_file: UploadFile = File(...),
    texture_files: Optional[List[UploadFile]] = File(None),
    thumbnail_image: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new accessory"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Find the category_id from the category name
        from database.models import AccessoryCategory  # Add this import at the top if not already there
        
        accessory_category = db.query(AccessoryCategory).filter(
            AccessoryCategory.name == category
        ).first()
        
        if not accessory_category:
            raise HTTPException(status_code=400, detail=f"Category '{category}' not found")
        
        # Create directories if they don't exist
        os.makedirs("static/accessories/models", exist_ok=True)
        os.makedirs("static/accessories/thumbnails", exist_ok=True)
        
        # Save model file
        model_extension = os.path.splitext(model_file.filename)[1]
        model_filename = generate_unique_filename("model", model_extension)
        model_path = f"static/accessories/models/{model_filename}"
        
        with open(model_path, "wb") as buffer:
            content = await model_file.read()
            buffer.write(content)
        
        # Save MTL file
        # mtl_filename = f"{base_name}.mtl"
        # mtl_path = f"static/accessories/materials/{mtl_filename}"
        # with open(mtl_path, "wb") as buffer:
        #     content = await mtl_file.read()
        #     buffer.write(content)
        
        # Save texture files if provided
        texture_paths = []
        if texture_files:
            for i, texture_file in enumerate(texture_files):
                if texture_file.filename:
                    texture_extension = os.path.splitext(texture_file.filename)[1]
                    texture_filename = f"{base_name}_texture_{i}{texture_extension}"
                    texture_path = f"static/accessories/textures/{texture_filename}"
                    
                    with open(texture_path, "wb") as buffer:
                        content = await texture_file.read()
                        buffer.write(content)
                    
                    texture_paths.append(f"/{texture_path}")
        
        # Save thumbnail if provided
        thumbnail_path = None
        if thumbnail_image:
            thumbnail_extension = os.path.splitext(thumbnail_image.filename)[1]
            thumbnail_filename = generate_unique_filename("thumbnail", thumbnail_extension)
            thumbnail_path = f"static/accessories/thumbnails/{thumbnail_filename}"
            
            with open(thumbnail_path, "wb") as buffer:
                content = await thumbnail_image.read()
                buffer.write(content)
        
        # Auto-calculate volume if not provided
        if volume_liters is None:
            volume_liters = (length_cm * width_cm * height_cm) / 1000  # Convert cm³ to liters
        
        # Parse additional colors
        available_colors = [default_color]
        if additional_colors:
            try:
                extra_colors = json.loads(additional_colors)
                available_colors.extend(extra_colors)
            except:
                pass  # If parsing fails, just use default color
        
        # Get model type from file extension
        model_type = model_extension.lower().replace('.', '')
        
        # Create accessory - CHANGED: use category_id instead of category
        accessory = Accessory(
            name=name,
            category_id=accessory_category.id,
            model_path=f"/{model_path}",
            model_type=model_type,
            # mtl_path=f"/{mtl_path}",
            # texture_paths=texture_paths,
            thumbnail_path=f"/{thumbnail_path}" if thumbnail_path else None,
            manufacturer=manufacturer,
            description=description,
            price=price,
            length_cm=length_cm,
            width_cm=width_cm,
            height_cm=height_cm,
            volume_liters=volume_liters,
            weight_kg=weight_kg,
            material_type=material_type,
            available_colors=available_colors,
            default_color=default_color,
            installation_difficulty=installation_difficulty,
            style_category=style_category
        )
        
        db.add(accessory)
        db.commit()
        db.refresh(accessory)
        
        return {"message": "Accessory created successfully", "accessory_id": accessory.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating accessory: {str(e)}")

@router.get("/")
async def list_accessories(
    category: Optional[str] = None,
    style: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all accessories with optional filtering"""
    try:
        query = db.query(Accessory)
        
        if category:
            query = query.filter(Accessory.category == category)
        if style:
            query = query.filter(Accessory.style_category == style)
            
        accessories = query.all()
        
        return {
            "accessories": [
                {
                    "id": acc.id,
                    "name": acc.name,
                    "category": acc.category,
                    "model_path": acc.model_path,
                    "thumbnail_path": acc.thumbnail_path,
                    "price": float(acc.price),
                    "manufacturer": acc.manufacturer,
                    "available_colors": acc.available_colors,
                    "default_color": acc.default_color,
                    "installation_difficulty": acc.installation_difficulty,
                    "style_category": acc.style_category
                }
                for acc in accessories
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{accessory_id}")
async def get_accessory(accessory_id: int, db: Session = Depends(get_db)):
    """Get a specific accessory"""
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    return {
        "id": accessory.id,
        "name": accessory.name,
        "category": accessory.category,
        "model_path": accessory.model_path,
        "model_type": accessory.model_type,
        "thumbnail_path": accessory.thumbnail_path,
        "manufacturer": accessory.manufacturer,
        "description": accessory.description,
        "price": float(accessory.price),
        "length_cm": accessory.length_cm,
        "width_cm": accessory.width_cm,
        "height_cm": accessory.height_cm,
        "volume_liters": accessory.volume_liters,
        "weight_kg": accessory.weight_kg,
        "material_type": accessory.material_type,
        "available_colors": accessory.available_colors,
        "default_color": accessory.default_color,
        "installation_difficulty": accessory.installation_difficulty,
        "style_category": accessory.style_category
    }

@router.delete("/{accessory_id}")
async def delete_accessory(
    accessory_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an accessory"""
    if not current_user or current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    # Delete files
    try:
        if accessory.model_path and os.path.exists(accessory.model_path.lstrip('/')):
            os.remove(accessory.model_path.lstrip('/'))
        if accessory.thumbnail_path and os.path.exists(accessory.thumbnail_path.lstrip('/')):
            os.remove(accessory.thumbnail_path.lstrip('/'))
    except Exception as e:
        print(f"Error deleting files: {e}")
    
    db.delete(accessory)
    db.commit()
    
    return {"message": "Accessory deleted successfully"}
