def format_order_status(status):
    """Format order status for display"""
    status_map = {
        "pending": "Pending",
        "awaiting_fulfillment": "Awaiting Fulfillment",
        "processing": "Processing",
        "shipped": "Shipped",
        "delivered": "Delivered",
        "cancelled": "Cancelled",
        "payment_pending": "Payment Pending",
        "paid": "Paid",
        "payment_failed": "Payment Failed"
    }
    return status_map.get(status, status.replace('_', ' ').title())
