from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Get database URL from environment or use default
DB_URL = os.environ.get('DATABASE_URL', 'postgresql://crib_user:crib_password@db:5432/crib_db')

# Create engine and session
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)

def run_migration():
    """Reset all password hashes to a default value."""
    # Default password will be 'changeme123'
    # This is the hash for 'changeme123' using sha256_crypt
    default_hash = '$5$rounds=535000$eOeYnEYWYzlBpVbX$XqkwXTbwPxs0postGxJCe1.5oRoAQGvNrZbQsXwWqR7'
    
    with Session() as session:
        # Update all user password hashes
        session.execute(text(f"UPDATE users SET password_hash = '{default_hash}'"))
        session.commit()
        print("All user passwords have been reset to 'changeme123'")
        print("Users will need to use the password reset functionality to set a new password.")

if __name__ == "__main__":
    run_migration()
