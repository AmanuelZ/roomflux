from sqlalchemy import create_engine, text
import sys

# Database connection
engine = create_engine('postgresql://crib_user:crib_password@db:5432/crib_db')

def update_user_password(email, new_password_hash):
    """Update a specific user's password hash directly in the database."""
    with engine.connect() as connection:
        # Update the user's password hash
        result = connection.execute(
            text("UPDATE users SET password_hash = :hash WHERE email = :email"),
            {"hash": new_password_hash, "email": email}
        )
        connection.commit()
        
        if result.rowcount > 0:
            print(f"Successfully updated password for user with email: {email}")
        else:
            print(f"No user found with email: {email}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python fix_user_password.py <email> <password_hash>")
        sys.exit(1)
    
    email = sys.argv[1]
    password_hash = sys.argv[2]
    update_user_password(email, password_hash)
