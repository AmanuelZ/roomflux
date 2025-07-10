from fastapi import APIRouter, Depends, HTTPException, Request, Form, BackgroundTasks
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Cart, CartItem, Order, OrderItem, Tile, User, ShippingAddress, Accessory
from typing import Optional, List
from pydantic import BaseModel
from auth.dependencies import get_current_user
# from utils.telebirr import initiate_payment, verify_payment
import json
from utils.helpers import format_order_status
from enterprise import get_enterprise

router = APIRouter()
templates = Jinja2Templates(directory="templates")

class ShippingAddressCreate(BaseModel):
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    phone: str
    is_default: bool = False

class CheckoutRequest(BaseModel):
    shipping_address_id: int
    payment_method: str  # 'telebirr' or 'cod'
    phone_number: Optional[str] = None

@router.get("/checkout", response_class=HTMLResponse)
async def checkout_page(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """Render the checkout page"""
    if not current_user:
        return RedirectResponse(url="/login?next=/checkout", status_code=303)
    
    # Get user's cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        return RedirectResponse(url="/cart", status_code=303)
    
    # Get cart items
    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
    if not cart_items:
        return RedirectResponse(url="/cart", status_code=303)
    
    # Get user's shipping addresses
    shipping_addresses = db.query(ShippingAddress).filter(
        ShippingAddress.user_id == current_user.id
    ).all()
    
    # Format cart items for display
    formatted_items = []
    total = 0
    
    for item in cart_items:
        if item.tile_id:
            # This is a tile/material
            tile = db.query(Tile).filter(Tile.id == item.tile_id).first()
            if tile:  # Check if tile exists
                subtotal = item.price_at_addition * item.quantity
                total += subtotal
                
                formatted_items.append({
                    "id": item.id,
                    "item_type": "tile",
                    "item_id": item.tile_id,
                    "name": tile.name,
                    "image_path": tile.image_path,
                    "price": item.price_at_addition,
                    "quantity": item.quantity,
                    "subtotal": subtotal
                })
        elif item.accessory_id:
            # This is an accessory
            accessory = db.query(Accessory).filter(Accessory.id == item.accessory_id).first()
            if accessory:  # Check if accessory exists
                subtotal = item.price_at_addition * item.quantity
                total += subtotal
                
                formatted_items.append({
                    "id": item.id,
                    "item_type": "accessory",
                    "item_id": item.accessory_id,
                    "name": accessory.name,
                    "image_path": accessory.thumbnail_path,
                    "price": item.price_at_addition,
                    "quantity": item.quantity,
                    "subtotal": subtotal
                })
    
    return templates.TemplateResponse("checkout.html", {
        "request": request,
        "user": current_user,
        "cart_items": formatted_items,
        "total": total,
        "shipping_addresses": shipping_addresses,
        "enterprise": enterprise
    })

@router.post("/api/shipping/addresses")
async def add_shipping_address(
    address: ShippingAddressCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new shipping address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # If this is the default address, unset any existing default
    if address.is_default:
        db.query(ShippingAddress).filter(
            ShippingAddress.user_id == current_user.id,
            ShippingAddress.is_default == True
        ).update({"is_default": False})
    
    # Create new address
    new_address = ShippingAddress(
        user_id=current_user.id,
        full_name=address.full_name,
        address_line1=address.address_line1,
        address_line2=address.address_line2,
        city=address.city,
        state=address.state,
        postal_code=address.postal_code,
        phone=address.phone,
        is_default=address.is_default
    )
    
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    
    return {"id": new_address.id, "message": "Shipping address added successfully"}

@router.post("/api/checkout/process")
async def process_checkout(
    checkout_data: CheckoutRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process checkout and initiate payment"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify shipping address exists and belongs to user
    shipping_address = db.query(ShippingAddress).filter(
        ShippingAddress.id == checkout_data.shipping_address_id,
        ShippingAddress.user_id == current_user.id
    ).first()
    
    if not shipping_address:
        raise HTTPException(status_code=404, detail="Shipping address not found")
    
    # Get user's cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Get cart items
    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total amount
    total_amount = sum(item.price_at_addition * item.quantity for item in cart_items)
    
    # Create order
    order = Order(
        user_id=current_user.id,
        status="pending",
        total_amount=total_amount,
        shipping_address_id=shipping_address.id,
        payment_method=checkout_data.payment_method,
        telebirr_msisdn=checkout_data.phone_number if checkout_data.payment_method == "telebirr" else None
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Create order items for both tiles and accessories
    for cart_item in cart_items:
        if cart_item.tile_id:
            # This is a tile
            order_item = OrderItem(
                order_id=order.id,
                tile_id=cart_item.tile_id,
                accessory_id=None,  # Explicitly set to None
                quantity=cart_item.quantity,
                price_at_purchase=cart_item.price_at_addition
            )
            db.add(order_item)
        elif cart_item.accessory_id:
            # This is an accessory
            order_item = OrderItem(
                order_id=order.id,
                tile_id=None,  # No tile
                accessory_id=cart_item.accessory_id,  # Use accessory_id field
                quantity=cart_item.quantity,
                price_at_purchase=cart_item.price_at_addition
            )
            db.add(order_item)
    
    db.commit()
    
    # Process payment based on method
    if checkout_data.payment_method == "telebirr":
        # Initiate Telebirr payment
        payment_subject = f"RoomFlux Order #{order.id}"
        payment_response = initiate_payment(
            amount=total_amount,
            subject=payment_subject,
            msisdn=checkout_data.phone_number
        )
        
        if "error" in payment_response:
            # If payment initiation failed, mark order as payment_pending (for manual follow-up)
            order.status = "payment_pending"
            order.notes = f"Telebirr payment failed: {payment_response['error']}"
            db.commit()
            
            # Return order info without payment URL
            return {
                "order_id": order.id,
                "payment_error": payment_response['error'],
                "out_trade_no": payment_response.get("out_trade_no")
            }
        
        # Update order with Telebirr transaction details
        order.telebirr_outTradeNo = payment_response.get("out_trade_no")
        db.commit()
        
        # Clear the cart after successful order creation
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
        
        return {
            "order_id": order.id,
            "payment_url": payment_response.get("toPayUrl"),
            "out_trade_no": payment_response.get("out_trade_no")
        }
    else:
        # Cash on Delivery - mark as awaiting fulfillment
        order.status = "awaiting_fulfillment"
        db.commit()
        
        # Clear the cart after successful order creation
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        db.commit()
        
        return {
            "order_id": order.id,
            "message": "Order placed successfully with Cash on Delivery"
        }
        
@router.get("/api/orders")
async def get_orders(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all orders for the current user"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        # Get shipping address
        shipping_address = db.query(ShippingAddress).filter(ShippingAddress.id == order.shipping_address_id).first()
        
        # Format shipping address
        address_str = f"{shipping_address.full_name}, {shipping_address.address_line1}"
        if shipping_address.address_line2:
            address_str += f", {shipping_address.address_line2}"
        address_str += f", {shipping_address.city}, {shipping_address.state}, {shipping_address.postal_code}"
        
        result.append({
            "id": order.id,
            "status": order.status,
            "total_amount": order.total_amount,
            "shipping_address": address_str,
            "payment_method": order.payment_method,
            "created_at": order.created_at.isoformat(),
            "telebirr_msisdn": order.telebirr_msisdn
        })
    
    return result

@router.get("/api/orders/{order_id}")
async def get_order(
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific order"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get order
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get order items
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    
    # Get shipping address
    shipping_address = db.query(ShippingAddress).filter(ShippingAddress.id == order.shipping_address_id).first()
    
    # Format items - UPDATE THIS PART
    items = []
    for item in order_items:
        if item.tile_id:
            # This is a tile/material
            tile = db.query(Tile).filter(Tile.id == item.tile_id).first()
            if tile:
                items.append({
                    "id": item.id,
                    "item_type": "tile",
                    "item_id": item.tile_id,
                    "name": tile.name,
                    "image_path": tile.image_path,
                    "price": item.price_at_purchase,
                    "quantity": item.quantity,
                    "subtotal": item.price_at_purchase * item.quantity
                })
        elif item.accessory_id:
            # This is an accessory
            accessory = db.query(Accessory).filter(Accessory.id == item.accessory_id).first()
            if accessory:
                items.append({
                    "id": item.id,
                    "item_type": "accessory",
                    "item_id": item.accessory_id,
                    "name": accessory.name,
                    "image_path": accessory.thumbnail_path,
                    "price": item.price_at_purchase,
                    "quantity": item.quantity,
                    "subtotal": item.price_at_purchase * item.quantity
                })
    
    # Format shipping address
    address = {
        "full_name": shipping_address.full_name,
        "address_line1": shipping_address.address_line1,
        "address_line2": shipping_address.address_line2,
        "city": shipping_address.city,
        "state": shipping_address.state,
        "postal_code": shipping_address.postal_code,
        "phone": shipping_address.phone
    }
    
    return {
        "id": order.id,
        "status": order.status,
        "total_amount": order.total_amount,
        "shipping_address": address,
        "payment_method": order.payment_method,
        "created_at": order.created_at.isoformat(),
        "items": items,
        "telebirr_msisdn": order.telebirr_msisdn,
        "telebirr_outTradeNo": order.telebirr_outTradeNo
    }


@router.post("/api/telebirr/callback")
async def telebirr_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Telebirr payment callback"""
    try:
        # Parse the callback data
        body = await request.json()
        
        # Extract the necessary information
        out_trade_no = body.get("outTradeNo")
        trade_status = body.get("tradeStatus")
        
        if not out_trade_no or not trade_status:
            return {"code": "400", "message": "Invalid callback data"}
        
        # Find the order by outTradeNo
        order = db.query(Order).filter(Order.telebirr_outTradeNo == out_trade_no).first()
        
        if not order:
            return {"code": "404", "message": "Order not found"}
        
        # Update order status based on trade status
        if trade_status == "SUCCESS":
            order.status = "paid"
            order.payment_id = body.get("transactionNo", "")
        elif trade_status == "FAILED":
            order.status = "payment_failed"
        
        db.commit()
        
        return {"code": "200", "message": "Success"}
    except Exception as e:
        return {"code": "500", "message": str(e)}

@router.get("/checkout/success")
async def checkout_success(
    request: Request,
    out_trade_no: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """Handle successful checkout"""
    if not current_user:
        return RedirectResponse(url="/login", status_code=303)
    
    # Find the order by outTradeNo
    order = db.query(Order).filter(
        Order.telebirr_outTradeNo == out_trade_no,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        return RedirectResponse(url="/orders", status_code=303)
    
    # Verify payment status with Telebirr
    payment_status = verify_payment(out_trade_no)
    
    # If payment verification was successful and payment is complete
    if payment_status.get("code") == "200" and payment_status.get("tradeStatus") == "SUCCESS":
        order.status = "paid"
        order.payment_id = payment_status.get("transactionNo", "")
        db.commit()
    
    return templates.TemplateResponse("checkout_success.html", {
        "request": request,
        "user": current_user,
        "order": order,
        "enterprise": enterprise
    })

@router.get("/orders", response_class=HTMLResponse)
async def orders_page(
    request: Request,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """Render the orders page"""
    if not current_user:
        return RedirectResponse(url="/login?next=/orders", status_code=303)
    
    # Get all orders for the user
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    
    return templates.TemplateResponse("orders.html", {
        "request": request,
        "user": current_user,
        "orders": orders,
        "format_order_status": format_order_status,
        "enterprise": enterprise
    })

@router.get("/orders/{order_id}", response_class=HTMLResponse)
async def order_detail_page(
    request: Request,
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise)
):
    """Render the order detail page"""
    if not current_user:
        return RedirectResponse(url=f"/login?next=/orders/{order_id}", status_code=303)
    
    # Get order
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        return RedirectResponse(url="/orders", status_code=303)
    
    # Get order items
    order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    
    # Get shipping address
    shipping_address = db.query(ShippingAddress).filter(ShippingAddress.id == order.shipping_address_id).first()
    
    # Format items with tile and accessory details - UPDATE THIS PART
    formatted_items = []
    for item in order_items:
        if item.tile_id:
            # This is a tile/material
            tile = db.query(Tile).filter(Tile.id == item.tile_id).first()
            if tile:
                formatted_items.append({
                    "id": item.id,
                    "item_type": "tile",
                    "item_id": item.tile_id,
                    "name": tile.name,
                    "image_path": tile.image_path,
                    "price": item.price_at_purchase,
                    "quantity": item.quantity,
                    "subtotal": item.price_at_purchase * item.quantity
                })
        elif item.accessory_id:
            # This is an accessory
            accessory = db.query(Accessory).filter(Accessory.id == item.accessory_id).first()
            if accessory:
                formatted_items.append({
                    "id": item.id,
                    "item_type": "accessory",
                    "item_id": item.accessory_id,
                    "name": accessory.name,
                    "image_path": accessory.thumbnail_path,
                    "price": item.price_at_purchase,
                    "quantity": item.quantity,
                    "subtotal": item.price_at_purchase * item.quantity
                })
    
    return templates.TemplateResponse("order_detail.html", {
        "request": request,
        "user": current_user,
        "order": order,
        "items": formatted_items,
        "shipping_address": shipping_address,
        "format_order_status": format_order_status,
        "enterprise": enterprise
    })

@router.post("/api/orders/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an order"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get order
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order can be cancelled
    if order.status not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled in its current state")
    
    # Update order status
    order.status = "cancelled"
    db.commit()
    
    return {"message": "Order cancelled successfully"}

