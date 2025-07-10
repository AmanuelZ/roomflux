# A simplified auth module without external dependencies
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import sha256_crypt, bcrypt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import User
import logging
from auth.dependencies import get_current_user


# Security settings
SECRET_KEY = "S3CUR3#AUTH@B3TT3R"  # Change this to a secure random string
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(
    schemes=["sha256_crypt"],
    deprecated="auto",
    sha256_crypt__default_rounds=30000
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str

# User model
class UserAuth(BaseModel):
    id: int
    username: str
    email: str

# Router
router = APIRouter()

# Helper functions
from passlib.hash import sha256_crypt

# Replace the existing password verification and hashing functions
def verify_password(plain_password, hashed_password):
    # Try different hash formats
    verifiers = [
        # Try sha256_crypt first
        lambda: sha256_crypt.verify(plain_password, hashed_password),
        # Try bcrypt as fallback
        lambda: bcrypt.verify(plain_password, hashed_password),
        # Add more verifiers if needed
    ]
    
    for verify_attempt in verifiers:
        try:
            if verify_attempt():
                return True
        except Exception as e:
            logging.debug(f"Password verification attempt failed: {str(e)}")
            continue
    
    # If we get here, all verification attempts failed
    logging.error(f"All password verification methods failed for hash: {hashed_password[:10]}...")
    return False

def get_password_hash(password):
    return sha256_crypt.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(request: Request, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try to get token from cookies first
    token = request.cookies.get("access_token")
    
    # If not in cookies, try to get from authorization header
    if not token:
        authorization = request.headers.get("Authorization")
        if not authorization:
            return None
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None
    
    return UserAuth(id=user.id, username=user.username, email=user.email)

# Auth class to mimic Better Auth
class Auth:
    def __init__(self):
        self.router = router
    
    async def get_user(self, request: Request, db: Session = Depends(get_db)):
        return await get_user(request, db)
    
    # Add these methods to the Auth class
    async def sign_in(self, response: Response, form_data: OAuth2PasswordRequestForm, db: Session):
        user = db.query(User).filter(
            (User.username == form_data.username) | (User.email == form_data.username)
        ).first()
        
        if not user or not verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=access_token_expires.total_seconds(),
            samesite="lax"
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    async def sign_up(self, response: Response, form_data: OAuth2PasswordRequestForm, db: Session, role: str = "customer"):
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == form_data.username) | (User.email == form_data.username)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered",
            )
        
        # Create new user with role
        hashed_password = get_password_hash(form_data.password)
        new_user = User(
            username=form_data.username,
            email=form_data.username,
            password_hash=hashed_password,
            role=role
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(new_user.id)}, expires_delta=access_token_expires
        )
        
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=access_token_expires.total_seconds(),
            samesite="lax"
        )
        
        return {"access_token": access_token, "token_type": "bearer"}

    
    async def sign_out(self, response: Response):
        response.delete_cookie(key="access_token")
        return {"message": "Successfully signed out"}

# Routes
@router.post("/sign-in")
async def sign_in_route(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    auth_instance = Auth()
    return await auth_instance.sign_in(response, form_data, db)

@router.post("/sign-up")
async def sign_up_route(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    auth_instance = Auth()
    return await auth_instance.sign_up(response, form_data, db)

@router.post("/sign-out")
async def sign_out_route(response: Response):
    auth_instance = Auth()
    return await auth_instance.sign_out(response)

# Create auth instance
auth = Auth()
print("Auth methods:", dir(auth))