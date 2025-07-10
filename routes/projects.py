from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import User, RoomDesign, Tile
from typing import List, Optional
from pydantic import BaseModel
import base64
import os
from datetime import datetime
import uuid
from auth.dependencies import get_current_user

router = APIRouter()

class ProjectCreate(BaseModel):
    tile_id: Optional[int] = None
    room_image_data: str  # Base64 encoded image
    rendered_image_data: str  # Base64 encoded image
    room_dimensions: Optional[dict] = None

class ProjectResponse(BaseModel):
    id: int
    tile_id: Optional[int] = None
    room_image_path: str
    rendered_image_path: str
    created_at: datetime

@router.post("/", status_code=status.HTTP_201_CREATED)
async def save_project(
    project: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Create directories if they don't exist
    os.makedirs("static/projects", exist_ok=True)
    
    # Generate unique filenames
    unique_id = uuid.uuid4().hex
    rendered_filename = f"rendered_{unique_id}.jpg"
    
    # Save rendered image to disk
    rendered_path = f"static/projects/{rendered_filename}"
    
    # Get the original image path
    original_image_path = project.room_image_data
    print(f"Original image path received: {original_image_path}")
    
    # Check if the original image path is a data URL
    if original_image_path.startswith('data:'):
        # It's a data URL, so we need to decode it and save it
        try:
            # Extract the base64 part
            header, base64_data = original_image_path.split(',', 1)
            # Add padding if needed
            padding = 4 - (len(base64_data) % 4)
            if padding < 4:
                base64_data += '=' * padding
            
            # Decode and save
            room_filename = f"room_{unique_id}.jpg"
            room_path = f"static/projects/{room_filename}"
            with open(room_path, "wb") as f:
                f.write(base64.b64decode(base64_data))
            
            # Update the original image path to the saved file
            original_image_path = f"/static/projects/{room_filename}"
            print(f"Saved data URL as: {original_image_path}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error saving original image: {str(e)}"
            )
    else:
        # It's a file path, make sure it has a leading slash
        if not original_image_path.startswith('/'):
            original_image_path = f"/{original_image_path}"
        print(f"Using file path: {original_image_path}")
        
        # Verify that the file exists
        file_path = original_image_path.lstrip('/')
        if not os.path.exists(file_path):
            print(f"Warning: Original image file not found at {file_path}")
            # We'll continue anyway, as the file might be accessible through the web server
    
    # Save the rendered image
    try:
        # Handle data URL format for rendered image
        if project.rendered_image_data.startswith('data:'):
            # Extract the base64 part
            header, base64_data = project.rendered_image_data.split(',', 1)
            # Add padding if needed
            padding = 4 - (len(base64_data) % 4)
            if padding < 4:
                base64_data += '=' * padding
            
            # Decode and save
            with open(rendered_path, "wb") as f:
                f.write(base64.b64decode(base64_data))
            print(f"Saved rendered image as: /static/projects/{rendered_filename}")
        else:
            # It's already a file path, so we'll copy the file
            source_path = project.rendered_image_data.lstrip('/')
            if os.path.exists(source_path):
                import shutil
                shutil.copy2(source_path, rendered_path)
                print(f"Copied rendered image from {source_path} to /static/projects/{rendered_filename}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Rendered image file not found: {source_path}"
                )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error saving rendered image: {str(e)}"
        )
    
    # Create project in database
    new_project = RoomDesign(
        user_id=current_user.id,
        tile_id=project.tile_id,
        room_image_path=original_image_path,
        rendered_image_path=f"/static/projects/{rendered_filename}",
        room_dimensions=project.room_dimensions
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    print(f"Project saved successfully with original image: {original_image_path} and rendered image: /static/projects/{rendered_filename}")
    
    return {
        "id": new_project.id,
        "message": "Project saved successfully"
    }


@router.get("/")
async def get_projects(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Use the imported function
):
    projects = db.query(RoomDesign).filter(RoomDesign.user_id == current_user.id).order_by(RoomDesign.created_at.desc()).all()
    
    return projects

@router.get("/{project_id}")
async def get_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Use the imported function
):
    project = db.query(RoomDesign).filter(
        RoomDesign.id == project_id,
        RoomDesign.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Use the imported function
):
    project = db.query(RoomDesign).filter(
        RoomDesign.id == project_id,
        RoomDesign.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete image files
    try:
        if project.room_image_path and os.path.exists(project.room_image_path.lstrip('/')):
            os.remove(project.room_image_path.lstrip('/'))
        if project.rendered_image_path and os.path.exists(project.rendered_image_path.lstrip('/')):
            os.remove(project.rendered_image_path.lstrip('/'))
    except Exception as e:
        print(f"Error deleting project files: {str(e)}")
    
    # Delete from database
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}
