"""
Add role and permissions columns to users table
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    # Create a connection
    with engine.connect() as conn:
        # Add role column with default value 'customer'
        conn.execute(text('''
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer',
        ADD COLUMN IF NOT EXISTS permissions VARCHAR(255);
        '''))
        
        # Commit the transaction
        conn.commit()
    
    print("Added role and permissions columns to users table successfully!")

if __name__ == "__main__":
    run_migration()
