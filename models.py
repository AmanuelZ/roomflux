from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

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

    category = relationship("Category", back_populates="tiles")
    technical_specs = relationship("TechnicalSpec", back_populates="tile")
    favorites = relationship("Favorite", back_populates="tile")

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    favorites = relationship("Favorite", back_populates="user")
    room_designs = relationship("RoomDesign", back_populates="user")

class TechnicalSpec(Base):
    __tablename__ = "technical_specs"
    
    id = Column(Integer, primary_key=True, index=True)
    tile_id = Column(Integer, ForeignKey("tiles.id"))
    water_resistance = Column(Float)
    slip_rating = Column(String(20))
    frost_resistant = Column(Boolean)
    indoor_outdoor = Column(String(20))
    pei_rating = Column(Integer)
    
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

