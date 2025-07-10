#!/usr/bin/env python3
import sys
import os
import logging

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def set_superadmin(email):
    """Set a user as superadmin by email."""
    try:
        # Create engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as connection:
            # First check if the user exists
            result = connection.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": email}
            )
            user = result.fetchone()
            
            if not user:
                logger.error(f"No user found with email: {email}")
                return False
            
            # Update the user's role
            result = connection.execute(
                text("UPDATE users SET role = 'superadmin' WHERE email = :email"),
                {"email": email}
            )
            connection.commit()
            
            logger.info(f"Successfully set user with email {email} as superadmin")
            return True
    except Exception as e:
        logger.error(f"Error setting superadmin: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python set_superadmin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    if set_superadmin(email):
        print(f"Successfully set {email} as superadmin")
    else:
        print(f"Failed to set {email} as superadmin")
        sys.exit(1)
