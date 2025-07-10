"""
Drop category column from accessories table
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Drop the category column from accessories table"""
    try:
        # Create engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                # Check if column exists first
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'accessories' 
                    AND column_name = 'category'
                """))
                
                if result.fetchone():
                    logger.info("Dropping category column from accessories table...")
                    
                    # Drop the category column
                    conn.execute(text("ALTER TABLE accessories DROP COLUMN category"))
                    
                    logger.info("Successfully dropped category column!")
                else:
                    logger.info("Category column doesn't exist, nothing to drop")
                
                # Commit transaction
                trans.commit()
                
            except Exception as e:
                # Rollback on error
                trans.rollback()
                raise e
                
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise e

if __name__ == "__main__":
    run_migration()
