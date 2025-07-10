from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Run the migration
def run_migration():
    # Add missing columns to enterprises table
    with engine.connect() as connection:
        # Check if columns exist before adding them
        connection.execute(text('''
        DO $$
        BEGIN
            -- Add website column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'enterprises' AND column_name = 'website'
            ) THEN
                ALTER TABLE enterprises ADD COLUMN website VARCHAR(255);
            END IF;
            
            -- Add address column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'enterprises' AND column_name = 'address'
            ) THEN
                ALTER TABLE enterprises ADD COLUMN address TEXT;
            END IF;
            
            -- Add phone column if it doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'enterprises' AND column_name = 'phone'
            ) THEN
                ALTER TABLE enterprises ADD COLUMN phone VARCHAR(50);
            END IF;
        END
        $$;
        '''))
        connection.commit()
    print("Enterprise columns migration completed successfully!")

if __name__ == "__main__":
    run_migration()
