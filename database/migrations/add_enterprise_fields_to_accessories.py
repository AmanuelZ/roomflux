"""
Add enterprise fields to accessories table (same as tiles)
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    # Create a connection
    with engine.connect() as conn:
        # Add enterprise fields to accessories table (same as tiles)
        conn.execute(text('''
        ALTER TABLE accessories 
        ADD COLUMN IF NOT EXISTS enterprise_id INTEGER,
        ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
        '''))
        
        # Add foreign key constraint for enterprise_id
        try:
            conn.execute(text('''
            ALTER TABLE accessories 
            ADD CONSTRAINT fk_accessories_enterprise_id 
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id);
            '''))
        except Exception as e:
            print(f"Note: Could not add foreign key constraint: {e}")
            print("This is normal if the constraint already exists or if using SQLite")
        
        # Commit the transaction
        conn.commit()
    
    print("Added enterprise fields to accessories table successfully!")

if __name__ == "__main__":
    run_migration()
