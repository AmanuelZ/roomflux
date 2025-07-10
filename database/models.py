from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Numeric, ForeignKey, JSON, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime 

class Tile(Base):
    __tablename__ = "tiles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    width = Column(Float)
    height = Column(Float)
    price_per_sqm = Column(Float)
    material = Column(String(50))
    finish_type = Column(String(50))
    manufacturer = Column(String(100))
    stock_status = Column(Boolean, default=True)
    image_path = Column(String(255))
    thumbnail_path = Column(String(255))
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Enterprise Materials
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=True)
    is_approved = Column(Boolean, default=False)  # For super admin approval
    is_public = Column(Boolean, default=False)

    # Relationships
    category = relationship("Category", back_populates="tiles")
    technical_specs = relationship("TechnicalSpec", back_populates="tile")
    favorites = relationship("Favorite", back_populates="tile")
    enterprise = relationship("Enterprise", back_populates="tiles")

    # material_type = Column(String)

class AccessoryCategory(Base):
    __tablename__ = "accessory_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)  # Human-readable name
    description = Column(String(255), nullable=True)
    icon = Column(String(50), nullable=True)  # CSS icon class (e.g., 'fas fa-bath')
    sort_order = Column(Integer, default=0)  # For custom ordering
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    accessories = relationship("Accessory", back_populates="accessory_category")

class Accessory(Base):
    __tablename__ = "accessories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("accessory_categories.id"), nullable=False)
    model_path = Column(String(255), nullable=False)
    model_type = Column(String(10), nullable=False)
    # mtl_path = Column(String, nullable=True)
    # texture_paths = Column(JSON, nullable=True)
    thumbnail_path = Column(String(255), nullable=True)
    manufacturer = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    length_cm = Column(Float, nullable=False)
    width_cm = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    volume_liters = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    material_type = Column(String(100), nullable=True)
    available_colors = Column(JSON, nullable=True)
    default_color = Column(String(7), nullable=False)
    installation_difficulty = Column(Enum('easy', 'medium', 'hard', 'very_hard', name='installation_difficulty'), nullable=False)
    style_category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Enterprise fields (same as Tile model)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=True)
    is_approved = Column(Boolean, default=False)  # For super admin approval
    is_public = Column(Boolean, default=False)

    # Relationships
    enterprise = relationship("Enterprise", back_populates="accessories")
    accessory_category = relationship("AccessoryCategory", back_populates="accessories")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    description = Column(String)
    parent_category_id = Column(Integer, ForeignKey("categories.id"))
    
    tiles = relationship("Tile", back_populates="category")
    subcategories = relationship("Category")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="customer")
    permissions = Column(String(255)) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    favorites = relationship("Favorite", back_populates="user")
    room_designs = relationship("RoomDesign", back_populates="user")

    # Update the User model to include relationships
    cart = relationship("Cart", uselist=False, back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    shipping_addresses = relationship("ShippingAddress", back_populates="user")
    enterprise_users = relationship("EnterpriseUser", back_populates="user")
    
    def has_role(self, role_name):
        """Check if the user has a specific role."""
        return self.role == role_name

class TechnicalSpec(Base):
    __tablename__ = "technical_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    tile_id = Column(Integer, ForeignKey("tiles.id"))
    water_resistance = Column(Float)
    slip_rating = Column(String(20))
    frost_resistant = Column(Boolean)
    indoor_outdoor = Column(String(20))
    pei_rating = Column(Integer)
    
    # New fields for paint
    paint_finish = Column(String(50), nullable=True)
    voc_content = Column(String(50), nullable=True)
    coverage_area = Column(Float, nullable=True)
    drying_time = Column(Float, nullable=True)
    
    # New fields for wallpaper
    pattern_repeat = Column(Float, nullable=True)
    washable = Column(Boolean, nullable=True)
    removable = Column(Boolean, nullable=True)
    
    # New fields for flooring
    wear_layer = Column(Float, nullable=True)
    
    tile = relationship("Tile", back_populates="technical_specs")

class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tile_id = Column(Integer, ForeignKey("tiles.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="favorites")
    tile = relationship("Tile", back_populates="favorites")

class RoomDesign(Base):
    __tablename__ = "room_designs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tile_id = Column(Integer, ForeignKey("tiles.id"))
    room_image_path = Column(String(255))
    rendered_image_path = Column(String(255))
    room_dimensions = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="room_designs")

# Add these models to your existing models.py file

class Cart(Base):
    __tablename__ = "carts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    __tablename__ = "cart_items"
    
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("carts.id"))
    tile_id = Column(Integer, ForeignKey("tiles.id"), nullable=True)
    accessory_id = Column(Integer, ForeignKey("accessories.id"), nullable=True) 
    quantity = Column(Integer, default=1)
    price_at_addition = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    cart = relationship("Cart", back_populates="items")
    tile = relationship("Tile")
    accessory = relationship("Accessory") 

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="pending")  # pending, paid, processing, shipped, delivered, cancelled
    total_amount = Column(Float)
    shipping_address_id = Column(Integer, ForeignKey("shipping_addresses.id"))
    payment_method = Column(String(50))
    payment_id = Column(String(100))  # Telebirr transaction ID
    telebirr_outTradeNo = Column(String(100))  # Telebirr out trade number
    telebirr_msisdn = Column(String(20))  # Customer phone number
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="orders")
    shipping_address = relationship("ShippingAddress")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    tile_id = Column(Integer, ForeignKey("tiles.id"), nullable=True)
    accessory_id = Column(Integer, ForeignKey("accessories.id"), nullable=True)
    quantity = Column(Integer)
    price_at_purchase = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order = relationship("Order", back_populates="items")
    tile = relationship("Tile")
    accessory = relationship("Accessory") 

class ShippingAddress(Base):
    __tablename__ = "shipping_addresses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    full_name = Column(String(100))
    address_line1 = Column(String(255))
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(20))
    phone = Column(String(20))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="shipping_addresses")

# Multi-Tenant Support

class Enterprise(Base):
    __tablename__ = "enterprises"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subdomain = Column(String(50), unique=True, nullable=False)
    custom_domain = Column(String(100), unique=True, nullable=True)
    active = Column(Boolean, default=True)

    logo_path = Column(String(255), nullable=True)
    primary_color = Column(String(20), nullable=True)
    secondary_color = Column(String(20), nullable=True)
    website = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    contact_email = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tiles = relationship("Tile", back_populates="enterprise")
    accessories = relationship("Accessory", back_populates="enterprise")
    users = relationship("EnterpriseUser", back_populates="enterprise")
    materials = relationship("EnterpriseMaterial", back_populates="enterprise")
    sample_rooms = relationship("EnterpriseSampleRoom", back_populates="enterprise")
    enterprise_3d_rooms = relationship("Enterprise3DRoom", back_populates="enterprise")

class EnterpriseUser(Base):
    __tablename__ = "enterprise_users"
    
    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(20), default="member")  # admin, member, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="enterprise_users")
    enterprise = relationship("Enterprise", back_populates="users")

class EnterpriseMaterial(Base):
    __tablename__ = "enterprise_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"))
    tile_id = Column(Integer, ForeignKey("tiles.id"))
    custom_name = Column(String(100), nullable=True)
    custom_price = Column(Float, nullable=True)
    custom_description = Column(String, nullable=True)
    visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    enterprise = relationship("Enterprise", back_populates="materials")
    tile = relationship("Tile")

class EnterpriseSampleRoom(Base):
    __tablename__ = "enterprise_sample_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"))
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # living_room, bedroom, bathroom, etc.
    image_path = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    enterprise = relationship("Enterprise", back_populates="sample_rooms")

class Enterprise3DRoom(Base):
    __tablename__ = "enterprise_3d_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    enterprise_id = Column(Integer, ForeignKey("enterprises.id"), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # bathroom, kitchen, living_room, bedroom, etc.
    model_path = Column(String(255), nullable=False)  # Path to .gltf/.glb file
    thumbnail_path = Column(String(255), nullable=False)  # Path to thumbnail image
    description = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    enterprise = relationship("Enterprise", back_populates="enterprise_3d_rooms")