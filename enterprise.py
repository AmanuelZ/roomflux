from fastapi import Request, Depends
from sqlalchemy.orm import Session
from database.database import SessionLocal, get_db
from database.models import Enterprise, EnterpriseUser
import logging
from typing import Optional, List
from auth.dependencies import get_current_user

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enterprise")
# logger = logging.getLogger(__name__)

async def enterprise_middleware(request: Request, call_next):
    """
    Middleware to detect enterprise based on subdomain or custom domain.
    Adds the enterprise to request.state if found.
    """
    # Extract host from request
    host = request.headers.get("host", "")
    logger.info(f"Processing request for host: {host}")
    
    # Skip for certain paths (like static files)
    if request.url.path.startswith("/static/"):
        return await call_next(request)
    
    # Initialize enterprise as None
    request.state.enterprise = None
    
    # Check if this is a custom domain or subdomain
    db = SessionLocal()
    try:
        # Check for custom domain match
        enterprise = db.query(Enterprise).filter(Enterprise.custom_domain == host, 
                                                Enterprise.active == True).first()
        
        # If not found, check for subdomain
        if not enterprise and "." in host:
            # Extract subdomain (first part before first dot)
            subdomain = host.split(".")[0]
            logger.info(f"Checking subdomain: {subdomain}")
            
            # Skip common subdomains that aren't enterprises
            if subdomain not in ["www", "api", "admin"]:
                enterprise = db.query(Enterprise).filter(Enterprise.subdomain == subdomain, 
                                                        Enterprise.active == True).first()
        
        # If enterprise found, add to request state
        if enterprise:
            logger.info(f"Found enterprise: {enterprise.name} (ID: {enterprise.id})")
            request.state.enterprise = enterprise
    except Exception as e:
        logger.error(f"Error in enterprise middleware: {str(e)}")
    finally:
        db.close()
    
    # Continue processing the request
    response = await call_next(request)
    return response


def get_enterprise(request: Request, db: Session = Depends(get_db)):
    """
    Dependency to get the current enterprise from request state.
    Returns None if no enterprise is found.
    """
    enterprise_id = getattr(request.state, "enterprise", None)
    if enterprise_id is None:
        return None
    
    # If enterprise_id is an Enterprise object (from middleware), return it
    if isinstance(enterprise_id, Enterprise):
        return enterprise_id
    
    # Otherwise, query the database
    return db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()

def get_enterprise_from_request(request: Request) -> Optional[str]:
    """
    Extract enterprise subdomain from request host
    """
    host = request.headers.get("host", "")
    logger.info(f"Processing request for host: {host}")
    
    # Check for enterprise query parameter (development mode)
    enterprise_param = request.query_params.get("enterprise")
    if enterprise_param:
        logger.info(f"Using enterprise from query parameter: {enterprise_param}")
        return enterprise_param
    
    # Handle localhost subdomains (e.g., example.localhost)
    if ".localhost" in host:
        subdomain = host.split(".localhost")[0]
        logger.info(f"Detected localhost subdomain: {subdomain}")
        return subdomain
    
    # Check for production subdomains (e.g., example.roomflux.com)
    if ".roomflux.com" in host:
        subdomain = host.split(".roomflux.com")[0]
        logger.info(f"Detected production subdomain: {subdomain}")
        return subdomain
    
    # Check if this is a custom domain
    if "." in host and not host.startswith("localhost"):
        # Remove port if present
        domain = host.split(":")[0]
        logger.info(f"Detected potential custom domain: {domain}")
        return domain
    
    # No enterprise found in the host
    logger.info("No enterprise detected from host")
    return None


async def get_enterprise(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[Enterprise]:
    """
    Dependency to get the current enterprise context based on the request host
    """
    subdomain_or_domain = get_enterprise_from_request(request)
    
    if not subdomain_or_domain:
        logger.info("No subdomain or domain found, returning None")
        return None
    
    # First check if this is a custom domain
    enterprise = db.query(Enterprise).filter(
        Enterprise.custom_domain == subdomain_or_domain,
        Enterprise.active == True
    ).first()
    
    # If not found, check if it's a subdomain
    if not enterprise:
        enterprise = db.query(Enterprise).filter(
            Enterprise.subdomain == subdomain_or_domain,
            Enterprise.active == True
        ).first()
    
    if enterprise:
        logger.info(f"Found enterprise: {enterprise.name} (ID: {enterprise.id})")
    else:
        logger.info(f"No enterprise found for {subdomain_or_domain}")
    
    return enterprise

async def get_enterprise_user(
    request: Request,
    db: Session = Depends(get_db),
    enterprise = Depends(get_enterprise),
    user = Depends(get_current_user)
) -> Optional[EnterpriseUser]:
    """
    Dependency to get the current enterprise user relationship
    """
    if not enterprise or not user:
        logger.info(f"No enterprise or user found. Enterprise: {enterprise}, User: {user}")
        return None
    
    logger.info(f"Looking for enterprise user. Enterprise ID: {enterprise.id}, User ID: {user.id}")
    
    enterprise_user = db.query(EnterpriseUser).filter(
        EnterpriseUser.enterprise_id == enterprise.id,
        EnterpriseUser.user_id == user.id
    ).first()
    
    logger.info(f"Enterprise user found: {enterprise_user}, Role: {enterprise_user.role if enterprise_user else 'None'}")
    
    # Store in request state for templates
    request.state.enterprise_user = enterprise_user
    
    return enterprise_user

def is_user_in_any_enterprise(user_id: int, db: Session) -> bool:
    """Check if a user is associated with any enterprise"""
    enterprise_user = db.query(EnterpriseUser).filter(
        EnterpriseUser.user_id == user_id
    ).first()
    return enterprise_user is not None

def get_user_enterprises(user_id: int, db: Session) -> List[Enterprise]:
    """Get all enterprises a user is associated with"""
    enterprise_users = db.query(EnterpriseUser).filter(
        EnterpriseUser.user_id == user_id
    ).all()
    
    enterprise_ids = [eu.enterprise_id for eu in enterprise_users]
    
    if not enterprise_ids:
        return []
    
    enterprises = db.query(Enterprise).filter(
        Enterprise.id.in_(enterprise_ids)
    ).all()
    
    return enterprises
