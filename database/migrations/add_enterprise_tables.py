from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Run the migration
def run_migration():
    # Create enterprises table
    with engine.connect() as connection:
        connection.execute(text('''
        CREATE TABLE IF NOT EXISTS enterprises (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            subdomain VARCHAR(50) UNIQUE NOT NULL,
            custom_domain VARCHAR(100) UNIQUE,
            logo_path VARCHAR(255),
            primary_color VARCHAR(20),
            secondary_color VARCHAR(20),
            contact_email VARCHAR(100),
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE TABLE IF NOT EXISTS enterprise_users (
            id SERIAL PRIMARY KEY,
            enterprise_id INTEGER REFERENCES enterprises(id),
            user_id INTEGER REFERENCES users(id),
            role VARCHAR(20) DEFAULT 'member',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS enterprise_materials (
            id SERIAL PRIMARY KEY,
            enterprise_id INTEGER REFERENCES enterprises(id),
            tile_id INTEGER REFERENCES tiles(id),
            custom_name VARCHAR(100),
            custom_price FLOAT,
            custom_description TEXT,
            visible BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE TABLE IF NOT EXISTS enterprise_sample_rooms (
            id SERIAL PRIMARY KEY,
            enterprise_id INTEGER REFERENCES enterprises(id),
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            image_path VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        '''))
        connection.commit()
    print("Enterprise tables migration completed successfully!")

if __name__ == "__main__":
    run_migration()
