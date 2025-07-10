"""
Add enterprise_3d_rooms table for managing 3D rooms per enterprise
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    # Create a connection
    with engine.connect() as conn:
        # Create enterprise_3d_rooms table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS enterprise_3d_rooms (
            id SERIAL PRIMARY KEY,
            enterprise_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            model_path VARCHAR(255) NOT NULL,
            thumbnail_path VARCHAR(255) NOT NULL,
            description VARCHAR(500),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        '''))
        
        # Add foreign key constraint for enterprise_id
        try:
            conn.execute(text('''
            ALTER TABLE enterprise_3d_rooms 
            ADD CONSTRAINT fk_enterprise_3d_rooms_enterprise_id 
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE;
            '''))
        except Exception as e:
            print(f"Note: Could not add foreign key constraint: {e}")
            print("This is normal if the constraint already exists or if using SQLite")
        
        # Add indexes for better performance
        try:
            conn.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_enterprise_3d_rooms_enterprise_id 
            ON enterprise_3d_rooms(enterprise_id);
            '''))
            
            conn.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_enterprise_3d_rooms_category 
            ON enterprise_3d_rooms(category);
            '''))
            
            conn.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_enterprise_3d_rooms_active 
            ON enterprise_3d_rooms(is_active);
            '''))
        except Exception as e:
            print(f"Note: Could not add indexes: {e}")
        
        # Add updated_at trigger (PostgreSQL specific)
        try:
            conn.execute(text('''
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            '''))
            
            conn.execute(text('''
            CREATE TRIGGER update_enterprise_3d_rooms_updated_at 
            BEFORE UPDATE ON enterprise_3d_rooms 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            '''))
        except Exception as e:
            print(f"Note: Could not add trigger (normal for SQLite): {e}")
        
        # Commit the transaction
        conn.commit()
    
    print("Created enterprise_3d_rooms table successfully!")

if __name__ == "__main__":
    run_migration()
