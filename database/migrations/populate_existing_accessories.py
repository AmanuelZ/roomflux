"""
Populate existing accessories with default enterprise fields
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    # Create a connection
    with engine.connect() as conn:
        # Update all existing accessories to be:
        # - Approved (since they were created by admin)
        # - Public (so they appear for all enterprises)
        # - No specific enterprise (enterprise_id = NULL means it's a global/admin accessory)
        conn.execute(text('''
        UPDATE accessories 
        SET 
            is_approved = TRUE,
            is_public = TRUE,
            enterprise_id = NULL
        WHERE 
            is_approved IS NULL 
            OR is_approved = FALSE;
        '''))
        
        # Commit the transaction
        conn.commit()
    
    print("Updated existing accessories to be approved and public!")

if __name__ == "__main__":
    run_migration()
