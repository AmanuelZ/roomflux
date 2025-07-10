from sqlalchemy import create_engine, text
from passlib.hash import sha256_crypt

# Create engine
engine = create_engine('postgresql://crib_user:crib_password@db:5432/crib_db')

def reset_all_passwords():
    """Reset all user passwords to 'password123' with consistent hashing."""
    # Generate a hash for 'password123' using sha256_crypt
    standard_password = "password123"
    password_hash = sha256_crypt.hash(standard_password)
    
    with engine.connect() as connection:
        # Update all users
        result = connection.execute(
            text("UPDATE users SET password_hash = :hash"),
            {"hash": password_hash}
        )
        connection.commit()
        
        print(f"Reset {result.rowcount} user passwords to 'password123'")
        print("Users can now log in with their email and 'password123'")

if __name__ == "__main__":
    reset_all_passwords()
