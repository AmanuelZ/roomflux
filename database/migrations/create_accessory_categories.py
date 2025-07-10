"""
Create accessory categories table and populate with initial data
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        # Create the accessory_categories table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS accessory_categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            display_name VARCHAR(100) NOT NULL,
            description VARCHAR(255),
            icon VARCHAR(50),
            sort_order INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        '''))
        
        # Insert initial categories
        initial_categories = [
            ('bathtubs', 'Bathtubs', 'Bathtubs and soaking tubs', 'fas fa-bath', 1),
            ('sinks', 'Sinks', 'Bathroom and kitchen sinks', 'fas fa-sink', 2),
            ('toilets', 'Toilets', 'Toilets and bidets', 'fas fa-toilet', 3),
            ('shower-boxes', 'Shower Boxes', 'Shower enclosures and boxes', 'fas fa-shower', 4),
            ('shower-systems', 'Shower Systems', 'Shower heads, valves, and complete systems', 'fas fa-tint', 5),
            ('cabinets', 'Cabinets', 'Storage cabinets and vanities', 'fas fa-archive', 6),
            ('mirrors', 'Mirrors', 'Bathroom and decorative mirrors', 'fas fa-mirror', 7),
            ('lighting', 'Lighting', 'Light fixtures and lamps', 'fas fa-lightbulb', 8),
            ('other', 'Other', 'Other accessories', 'fas fa-ellipsis-h', 9)
        ]
        
        for name, display_name, description, icon, sort_order in initial_categories:
            conn.execute(text('''
            INSERT INTO accessory_categories (name, display_name, description, icon, sort_order)
            VALUES (:name, :display_name, :description, :icon, :sort_order)
            ON CONFLICT (name) DO NOTHING;
            '''), {
                'name': name,
                'display_name': display_name,
                'description': description,
                'icon': icon,
                'sort_order': sort_order
            })
        
        # Add category_id column to accessories table if it doesn't exist
        conn.execute(text('''
        ALTER TABLE accessories 
        ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES accessory_categories(id);
        '''))
        
        # Migrate existing category data
        conn.execute(text('''
        UPDATE accessories 
        SET category_id = (
            SELECT id FROM accessory_categories 
            WHERE accessory_categories.name = accessories.category
        )
        WHERE category_id IS NULL AND category IS NOT NULL;
        '''))
        
        conn.commit()
    
    print("Accessory categories created and populated successfully!")

if __name__ == "__main__":
    run_migration()
