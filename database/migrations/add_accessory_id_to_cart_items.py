"""
Add accessory_id column to cart_items table
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    # Create a connection
    with engine.connect() as conn:
        # Add accessory_id column
        conn.execute(text('''
        ALTER TABLE cart_items 
        ADD COLUMN IF NOT EXISTS accessory_id INTEGER;
        '''))
        
        # Add foreign key constraint (if your database supports it)
        try:
            conn.execute(text('''
            ALTER TABLE cart_items 
            ADD CONSTRAINT fk_cart_items_accessory_id 
            FOREIGN KEY (accessory_id) REFERENCES accessories(id);
            '''))
        except Exception as e:
            print(f"Note: Could not add foreign key constraint: {e}")
            print("This is normal if the constraint already exists or if using SQLite")
        
        # Make tile_id nullable (allow NULL values)
        try:
            conn.execute(text('''
            ALTER TABLE cart_items 
            ALTER COLUMN tile_id DROP NOT NULL;
            '''))
        except Exception as e:
            print(f"Note: Could not modify tile_id constraint: {e}")
            print("This is normal if the column is already nullable or if using SQLite")
        
        # Commit the transaction
        conn.commit()
    
    print("Added accessory_id column to cart_items table successfully!")

if __name__ == "__main__":
    run_migration()
