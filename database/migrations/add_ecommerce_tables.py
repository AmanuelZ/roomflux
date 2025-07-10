"""
Add e-commerce tables (Cart, CartItem, Order, OrderItem, ShippingAddress)
"""
from sqlalchemy import create_engine, text
from database.database import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def run_migration():
    # Create a connection
    with engine.connect() as conn:
        # Create carts table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS carts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_carts_id ON carts (id);
        '''))
        
        # Create cart_items table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            cart_id INTEGER REFERENCES carts(id),
            tile_id INTEGER REFERENCES tiles(id),
            quantity INTEGER DEFAULT 1,
            price_at_addition FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_cart_items_id ON cart_items (id);
        '''))
        
        # Create shipping_addresses table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS shipping_addresses (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            full_name VARCHAR(100),
            address_line1 VARCHAR(255),
            address_line2 VARCHAR(255),
            city VARCHAR(100),
            state VARCHAR(100),
            postal_code VARCHAR(20),
            phone VARCHAR(20),
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_shipping_addresses_id ON shipping_addresses (id);
        '''))
        
        # Create orders table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            status VARCHAR(20) DEFAULT 'pending',
            total_amount FLOAT,
            shipping_address_id INTEGER REFERENCES shipping_addresses(id),
            payment_method VARCHAR(50),
            payment_id VARCHAR(100),
            telebirr_outTradeNo VARCHAR(100),
            telebirr_msisdn VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS ix_orders_id ON orders (id);
        '''))
        
        # Create order_items table
        conn.execute(text('''
        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id),
            tile_id INTEGER REFERENCES tiles(id),
            quantity INTEGER,
            price_at_purchase FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_order_items_id ON order_items (id);
        '''))
        
        # Commit the transaction
        conn.commit()
    
    print("E-commerce tables created successfully!")

if __name__ == "__main__":
    run_migration()
