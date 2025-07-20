from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from database.models import Tile, TechnicalSpec, EnterpriseMaterial
from database.database import get_db
from typing import Optional
import os
import uuid
from PIL import Image
import io
from enterprise import get_enterprise

router = APIRouter()

@router.post("/tiles/")
async def create_tile(
    request: Request,
    name: str = Form(...),
    material: str = Form(...),  
    price_per_sqm: float = Form(...),
    # size_width: Optional[float] = Form(None),
    # size_height: Optional[float] = Form(None),

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
    enterprise = Depends(get_enterprise)
):
    # Print form data for debugging
    form_data = await request.form()
    print("Form data:", form_data)
    
    # Determine width and height based on material type
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
    
    # Convert to float if not None
    try:
        width = float(width) if width else None
        height = float(height) if height else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Size dimensions must be valid numbers")
    
    print(f"Material: {material}, Width: {width}, Height: {height}")
    
    # Handle different material types
    if material == 'paint':
        # Make sure paint_type is defined before using it
        if not paint_type:
            paint_type = "solid"  # Default to solid if not specified
            
        if paint_type == 'solid' and not color_code:
            raise HTTPException(status_code=400, detail="Color code is required for solid paint")
        if paint_type == 'textured' and not image:
            raise HTTPException(status_code=400, detail="Texture image is required for textured paint")
    
    if material in ['tile', 'wallpaper', 'flooring'] and not (width and height):
        raise HTTPException(status_code=400, detail=f"Size dimensions are required for {material}")
    
    # Save image for non-solid-paint materials
    image_url = None
    
    # Debug print
    print(f"Image: {image}")
    if image:
        print(f"Image filename: {image.filename}")
    
    if image and image.filename and (material != 'paint' or (material == 'paint' and paint_type == 'textured')):
        try:
            # Create a unique filename to avoid conflicts
            _, ext = os.path.splitext(image.filename)
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            
            # Make sure the directory exists
            static_dir = "static"
            tiles_dir = os.path.join(static_dir, "tiles")
            os.makedirs(tiles_dir, exist_ok=True)
            
            # Set the file location with the unique filename
            file_location = os.path.join(tiles_dir, unique_filename)
            image_url = f"/static/tiles/{unique_filename}"
            
            # Debug print
            print(f"Saving image to: {file_location}")
            print(f"Image URL will be: {image_url}")
            
            # Save the file
            contents = await image.read()
            with open(file_location, "wb") as file_object:
                file_object.write(contents)
                
            # Verify file was saved
            if os.path.exists(file_location):
                print(f"File successfully saved at {file_location}")
                print(f"File size: {os.path.getsize(file_location)} bytes")
            else:
                print(f"Failed to save file at {file_location}")
                
        except Exception as e:
            print(f"Error saving image: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving image: {str(e)}")
    
    # For solid paint, use color code as the "image"
    if material == 'paint' and paint_type == 'solid':
        # Generate a solid color image
        try:

            # Create a unique filename
            color_hex = color_code.lstrip('#')
            unique_filename = f"color_{color_hex}.png"
            
            # Make sure the directory exists
            static_dir = "static"
            tiles_dir = os.path.join(static_dir, "tiles")
            os.makedirs(tiles_dir, exist_ok=True)
            
            # Set the file location with the unique filename
            file_location = os.path.join(tiles_dir, unique_filename)
            image_url = f"/static/tiles/{unique_filename}"
            
            # Check if the file already exists
            if not os.path.exists(file_location):
                # Create a solid color image
                size = (200, 200)  # 200x200 pixels
                
                # Convert hex to RGB
                r = int(color_hex[0:2], 16)
                g = int(color_hex[2:4], 16)
                b = int(color_hex[4:6], 16)
                
                # Create the image
                img = Image.new('RGB', size, color=(r, g, b))
                
                # Save the image
                img.save(file_location)
                
                print(f"Created solid color image at {file_location}")
            else:
                print(f"Using existing solid color image at {file_location}")
            
            print(f"Using solid color image: {image_url}")
        except Exception as e:
            # Fallback to using the hex code directly if image creation fails
            print(f"Error creating solid color image: {str(e)}")
            image_url = f"#{color_code.lstrip('#')}"
            print(f"Falling back to hex code: {image_url}")

    
    # Debug print
    print(f"Final image_url: {image_url}")
    
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
        stock_status=True
    )

    db.add(tile)
    db.commit()
    db.refresh(tile)  # Refresh to get the ID
    
    # Debug print
    print(f"Created tile with ID: {tile.id}")
    print(f"Tile image_path: {tile.image_path}")

    # Add technical specs based on material type
    if material == 'tile':
        specs = TechnicalSpec(
            tile_id=tile.id,
            water_resistance=0.8,
            slip_rating="R9",
            frost_resistant=True,
            indoor_outdoor="indoor",
            pei_rating=4
        )
    elif material == 'paint':
        specs = TechnicalSpec(
            tile_id=tile.id,
            paint_finish=paint_finish,
            voc_content="Low",
            coverage_area=10,
            drying_time=4
        )
    elif material == 'wallpaper':
        specs = TechnicalSpec(
            tile_id=tile.id,
            pattern_repeat=64,
            washable=True,
            removable=True
        )
    else:  # flooring
        specs = TechnicalSpec(
            tile_id=tile.id,
            water_resistance=0.9,
            slip_rating="R10",
            wear_layer=0.5
        )
    
    db.add(specs)
    
    # If this is being created in an enterprise context, associate it with the enterprise
    if enterprise:
        enterprise_material = EnterpriseMaterial(
            enterprise_id=enterprise.id,
            tile_id=tile.id,
            visible=True
        )
        db.add(enterprise_material)

    db.commit()
    
    return {"message": "Material created successfully", "tile_id": tile.id}

# Add enterprise routes to get tiles filtered 
@router.get("/api/enterprise/tiles")
def get_enterprise_tiles(
    request: Request,
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """Get tiles filtered by the current enterprise context"""
    if enterprise:
        # Get tiles associated with this enterprise
        enterprise_materials = db.query(EnterpriseMaterial).filter(
            EnterpriseMaterial.enterprise_id == enterprise.id,
            EnterpriseMaterial.visible == True
        ).all()
        
        # Get the actual tile IDs
        tile_ids = [em.tile_id for em in enterprise_materials]
        
        # Query tiles with these IDs
        tiles = db.query(Tile).filter(Tile.id.in_(tile_ids)).all()
    else:
        # If no enterprise context, return all tiles
        tiles = db.query(Tile).all()
    
    return {"tiles": tiles}