from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Cart, CartItem, Tile, User, Accessory 
from typing import Optional, List
from pydantic import BaseModel
from auth.dependencies import get_current_user

router = APIRouter()

class CartItemCreate(BaseModel):
    tile_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

@router.get("/")
async def get_cart(request: Request, current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current user's cart"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get or create cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    
    # Get cart items with tile and accessory details
    items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
    
    # Calculate total
    total = sum(item.price_at_addition * item.quantity for item in items)
    
    # Format response
    cart_items = []
    for item in items:
        if item.tile_id:
            # This is a tile/material
            tile = db.query(Tile).filter(Tile.id == item.tile_id).first()
            cart_items.append({
                "id": item.id,
                "item_type": "tile",
                "item_id": item.tile_id,
                "name": tile.name,
                "image_path": tile.image_path,
                "price": item.price_at_addition,
                "quantity": item.quantity,
                "subtotal": item.price_at_addition * item.quantity
            })
        elif item.accessory_id:
            # This is an accessory
            accessory = db.query(Accessory).filter(Accessory.id == item.accessory_id).first()
            cart_items.append({
                "id": item.id,
                "item_type": "accessory",
                "item_id": item.accessory_id,
                "name": accessory.name,
                "image_path": accessory.thumbnail_path,
                "price": item.price_at_addition,
                "quantity": item.quantity,
                "subtotal": item.price_at_addition * item.quantity
            })
    
    return {
        "cart_id": cart.id,
        "items": cart_items,
        "total": total,
        "item_count": len(items)
    }


@router.post("/items")
async def add_to_cart(
    item: CartItemCreate, 
    current_user = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Add an item to the cart"""
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Verify tile exists
        tile = db.query(Tile).filter(Tile.id == item.tile_id).first()
        if not tile:
            raise HTTPException(status_code=404, detail="Tile not found")
        
        # Get or create cart
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
        if not cart:
            cart = Cart(user_id=current_user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        
        # Check if item already in cart
        cart_item = db.query(CartItem).filter(
            CartItem.cart_id == cart.id,
            CartItem.tile_id == item.tile_id
        ).first()
        
        if cart_item:
            # Update quantity if already in cart
            cart_item.quantity += item.quantity
        else:
            # Add new item to cart
            cart_item = CartItem(
                cart_id=cart.id,
                tile_id=item.tile_id,
                quantity=item.quantity,
                price_at_addition=tile.price_per_sqm
            )
            db.add(cart_item)
        
        db.commit()
        
        return {"message": "Item added to cart", "cart_item_id": cart_item.id}
    except Exception as e:
        # Log the error for debugging
        import logging
        logging.error(f"Error adding item to cart: {str(e)}")
        # Return a more informative error
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.put("/items/{item_id}")
async def update_cart_item(
    item_id: int,
    item_update: CartItemUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cart item quantity"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user's cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Get cart item
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if item_update.quantity <= 0:
        # Remove item if quantity is 0 or negative
        db.delete(cart_item)
    else:
        # Update quantity
        cart_item.quantity = item_update.quantity
    
    db.commit()
    
    return {"message": "Cart updated"}

@router.delete("/items/{item_id}")
async def remove_from_cart(
    item_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove an item from the cart"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user's cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Get cart item
    cart_item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    # Remove the item
    db.delete(cart_item)
    db.commit()
    
    return {"message": "Item removed from cart"}

@router.delete("/")
async def clear_cart(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear the entire cart"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user's cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        return {"message": "Cart is already empty"}
    
    # Delete all cart items
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    
    return {"message": "Cart cleared"}

@router.post("/accessories")
async def add_accessory_to_cart(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an accessory to cart"""
    print("Add to cart for accessory")
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get request body
    import json
    
    try:
        body = await request.body()
        request_data = json.loads(body.decode())
        
        accessory_id = request_data.get("accessory_id")
        quantity = request_data.get("quantity", 1)
        
        if not accessory_id:
            raise HTTPException(status_code=400, detail="accessory_id is required")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request body: {str(e)}")
    
    # Verify accessory exists
    accessory = db.query(Accessory).filter(Accessory.id == accessory_id).first()
    if not accessory:
        raise HTTPException(status_code=404, detail="Accessory not found")
    
    # Get or create cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    
    # Check if accessory already in cart
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.accessory_id == accessory_id  # Use accessory_id field
    ).first()
    
    if existing_item:
        # Update quantity if already in cart
        existing_item.quantity += quantity
    else:
        # Add new accessory to cart
        cart_item = CartItem(
            cart_id=cart.id,
            tile_id=None,  # No tile
            accessory_id=accessory_id,  # Use accessory_id field
            quantity=quantity,
            price_at_addition=accessory.price
        )
        db.add(cart_item)
    
    db.commit()
    
    return {"message": "Accessory added to cart successfully"}
