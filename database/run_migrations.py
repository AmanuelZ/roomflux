import os
import importlib.util
from database.database import DATABASE_URL
from sqlalchemy import create_engine

def run_all_migrations():
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Get the migrations directory
    migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
    
    # Check if directory exists
    if not os.path.exists(migrations_dir):
        os.makedirs(migrations_dir)
        print(f"Created migrations directory: {migrations_dir}")
        return
    
    # Get all migration files
    migration_files = [f for f in os.listdir(migrations_dir) if f.endswith('.py')]
    
    if not migration_files:
        print("No migration files found.")
        return
    
    # Sort migration files (if they have a numeric prefix)
    migration_files.sort()
    
    # Run each migration
    for migration_file in migration_files:
        print(f"Running migration: {migration_file}")
        
        # Load the module
        module_path = os.path.join(migrations_dir, migration_file)
        spec = importlib.util.spec_from_file_location("migration", module_path)
        migration_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration_module)
        
        # Run the migration
        if hasattr(migration_module, 'run_migration'):
            migration_module.run_migration()
        else:
            print(f"Warning: {migration_file} does not have a run_migration function")
    
    print("All migrations completed successfully!")

if __name__ == "__main__":
    run_all_migrations()
