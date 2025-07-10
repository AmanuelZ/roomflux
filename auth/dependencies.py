from fastapi import Request, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import User
from jose import jwt
import logging

# Security settings (copy these from main.py)
SECRET_KEY = "S3CUR3#AUTH@B3TT3R"
ALGORITHM = "HS256"

async def get_current_user(request: Request, db: Session = Depends(get_db)):
    """Get the current logged-in user from the request."""
    try:
        # Get the token from the cookie
        token = request.cookies.get("access_token")
        if not token:
            return None
            
        # Verify the token and get the user ID
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
            
        # Get the user from the database
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except Exception as e:
        logging.error(f"Error getting current user: {str(e)}")
        return None
