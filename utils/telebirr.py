import requests
import json
import uuid
import time
import base64
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Telebirr API configuration
TELEBIRR_API_URL = os.getenv("TELEBIRR_API_URL", "https://api.ethiotelecom.et/telebirr/v1/payment-api/")
APP_ID = os.getenv("TELEBIRR_APP_ID")
APP_KEY = os.getenv("TELEBIRR_APP_KEY")
PUBLIC_KEY = os.getenv("TELEBIRR_PUBLIC_KEY")
NOTIFY_URL = os.getenv("TELEBIRR_NOTIFY_URL")
RETURN_URL = os.getenv("TELEBIRR_RETURN_URL")
SHORT_CODE = os.getenv("TELEBIRR_SHORT_CODE")

# Check if Telebirr is properly configured
TELEBIRR_ENABLED = all([PUBLIC_KEY, APP_ID, APP_KEY, SHORT_CODE])

def encrypt_with_public_key(data):
    """Encrypt data with Telebirr's public key"""
    if not PUBLIC_KEY:
        raise ValueError("Telebirr public key is not configured")
        
    public_key = RSA.importKey(base64.b64decode(PUBLIC_KEY))
    cipher = PKCS1_v1_5.new(public_key)
    
    # Convert data to JSON string and encode to bytes
    data_bytes = json.dumps(data).encode('utf-8')
    
    # Encrypt the data
    encrypted_data = cipher.encrypt(data_bytes)
    
    # Return base64 encoded encrypted data
    return base64.b64encode(encrypted_data).decode('utf-8')

def generate_out_trade_no():
    """Generate a unique trade number"""
    return f"RoomFlux-{int(time.time())}-{uuid.uuid4().hex[:8]}"

def initiate_payment(amount, subject, msisdn=None):
    """
    Initiate a payment request to Telebirr
    
    Args:
        amount: Payment amount
        subject: Payment description
        msisdn: Customer phone number (optional)
        
    Returns:
        dict: Response from Telebirr API or error message
    """
    # Check if Telebirr is enabled
    if not TELEBIRR_ENABLED:
        return {
            "error": "Telebirr payment is not properly configured",
            "out_trade_no": generate_out_trade_no()
        }
    
    try:
        # Generate a unique trade number
        out_trade_no = generate_out_trade_no()
        
        # Prepare request data
        timestamp = str(int(time.time() * 1000))
        nonce = uuid.uuid4().hex
        
        # Prepare the request payload
        payload = {
            "appId": APP_ID,
            "nonce": nonce,
            "notifyUrl": NOTIFY_URL,
            "outTradeNo": out_trade_no,
            "returnUrl": RETURN_URL,
            "shortCode": SHORT_CODE,
            "subject": subject,
            "timeoutExpress": "30",  # 30 minutes timeout
            "timestamp": timestamp,
            "totalAmount": str(amount)
        }
        
        # Add msisdn if provided
        if msisdn:
            payload["msisdn"] = msisdn
        
        # Encrypt the payload
        encrypted_payload = encrypt_with_public_key(payload)
        
        # Prepare the final request body
        request_body = {
            "appId": APP_ID,
            "sign": encrypted_payload
        }
        
        # Make the API request
        response = requests.post(
            f"{TELEBIRR_API_URL}/toTradeWebPay",
            json=request_body,
            headers={"Content-Type": "application/json"}
        )
        
        # Parse the response
        response_data = response.json()
        
        # Add the out_trade_no to the response for reference
        response_data["out_trade_no"] = out_trade_no
        
        return response_data
    except Exception as e:
        return {"error": str(e), "out_trade_no": generate_out_trade_no()}

def verify_payment(out_trade_no):
    """
    Verify payment status with Telebirr
    
    Args:
        out_trade_no: The unique trade number used for the payment
        
    Returns:
        dict: Payment status information
    """
    # Prepare request data
    timestamp = str(int(time.time() * 1000))
    nonce = uuid.uuid4().hex
    
    # Prepare the request payload
    payload = {
        "appId": APP_ID,
        "nonce": nonce,
        "outTradeNo": out_trade_no,
        "timestamp": timestamp
    }
    
    # Encrypt the payload
    encrypted_payload = encrypt_with_public_key(payload)
    
    # Prepare the final request body
    request_body = {
        "appId": APP_ID,
        "sign": encrypted_payload
    }
    
    try:
        # Make the API request
        response = requests.post(
            f"{TELEBIRR_API_URL}/queryOrder",
            json=request_body,
            headers={"Content-Type": "application/json"}
        )
        
        # Parse the response
        return response.json()
    except Exception as e:
        return {"error": str(e)}
