from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Run the migration
def run_migration():
    print("Starting accessories table migration...")
    
    # Create accessories table
    with engine.connect() as connection:
        try:
            # Create the installation_difficulty enum type first
            print("Creating installation_difficulty enum type...")
            connection.execute(text('''
            DO $$
            BEGIN
                -- Create enum type for installation difficulty if it doesn't exist
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installation_difficulty') THEN
                    CREATE TYPE installation_difficulty AS ENUM ('easy', 'medium', 'hard', 'very_hard');
                    RAISE NOTICE 'Created installation_difficulty enum type';
                ELSE
                    RAISE NOTICE 'installation_difficulty enum type already exists';
                END IF;
            END
            $$;
            '''))
            
            # Create accessories table if it doesn't exist
            print("Creating accessories table...")
            connection.execute(text('''
            CREATE TABLE IF NOT EXISTS accessories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(50) NOT NULL,
                model_path VARCHAR(255) NOT NULL,
                model_type VARCHAR(10) NOT NULL,
                thumbnail_path VARCHAR(255),
                manufacturer VARCHAR(255) NOT NULL,
                description TEXT,
                price NUMERIC(10, 2) NOT NULL,
                length_cm FLOAT NOT NULL,
                width_cm FLOAT NOT NULL,
                height_cm FLOAT NOT NULL,
                volume_liters FLOAT,
                weight_kg FLOAT,
                material_type VARCHAR(100),
                available_colors JSON,
                default_color VARCHAR(7) NOT NULL,
                installation_difficulty installation_difficulty NOT NULL,
                style_category VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            '''))
            print("Accessories table created successfully!")
            
            # Create index on category for better performance
            print("Creating indexes...")
            connection.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_accessories_category ON accessories(category);
            '''))
            
            # Create index on style_category for filtering
            connection.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_accessories_style ON accessories(style_category);
            '''))
            
            # Create index on installation_difficulty for filtering
            connection.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_accessories_installation ON accessories(installation_difficulty);
            '''))
            
            connection.commit()
            print("All indexes created successfully!")
            
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            connection.rollback()
            raise e
            
    print("Accessories table migration completed successfully!")

if __name__ == "__main__":
    run_migration()
