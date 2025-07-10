from sqlalchemy import text
from database.database import engine

# Run the migration
def run_migration():
    # Add new columns to technical_specs table
    with engine.connect() as connection:
        connection.execute(text('''
        ALTER TABLE technical_specs 
        ADD COLUMN IF NOT EXISTS paint_finish VARCHAR(50),
        ADD COLUMN IF NOT EXISTS voc_content VARCHAR(50),
        ADD COLUMN IF NOT EXISTS coverage_area FLOAT,
        ADD COLUMN IF NOT EXISTS drying_time FLOAT,
        ADD COLUMN IF NOT EXISTS pattern_repeat FLOAT,
        ADD COLUMN IF NOT EXISTS washable BOOLEAN,
        ADD COLUMN IF NOT EXISTS removable BOOLEAN,
        ADD COLUMN IF NOT EXISTS wear_layer FLOAT;
        '''))
        connection.commit()
    print('Migration completed successfully!')

if __name__ == '__main__':
    run_migration()
