#!/usr/bin/env python3
import os
import sys
import logging
import torch
import torch.hub
import requests
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define model URLs and their destination paths
MODEL_FILES = [
    {
        "url": "https://download.pytorch.org/models/resnet101-63fe2227.pth",
        "path": "checkpoints/resnet101-63fe2227.pth"
    },
    # Add other model files as needed
]

def download_file(url, destination):
    """Download a file from URL to destination."""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        
        # Check if file already exists
        if os.path.exists(destination):
            logger.info(f"File already exists: {destination}")
            return True
            
        logger.info(f"Downloading {url} to {destination}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(destination, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        logger.info(f"Successfully downloaded {url}")
        return True
    except Exception as e:
        logger.error(f"Error downloading {url}: {str(e)}")
        return False

def setup_torch_home():
    """Set up the TORCH_HOME environment variable."""
    # Set TORCH_HOME to a directory in the project
    torch_home = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
    os.environ['TORCH_HOME'] = torch_home
    logger.info(f"Set TORCH_HOME to {torch_home}")
    return torch_home

def download_models():
    """Download all required model files."""
    torch_home = setup_torch_home()
    
    # Download specific model files
    success = True
    for model in MODEL_FILES:
        destination = os.path.join(torch_home, model["path"])
        if not download_file(model["url"], destination):
            success = False
    
    # Pre-download models used by torch.hub
    try:
        # This will download the model to the TORCH_HOME directory
        logger.info("Pre-downloading ResNet101 model...")
        torch.hub.load('pytorch/vision:v0.10.0', 'resnet101', pretrained=True)
        logger.info("Successfully pre-downloaded ResNet101 model")
    except Exception as e:
        logger.error(f"Error pre-downloading ResNet101: {str(e)}")
        success = False
    
    return success

if __name__ == "__main__":
    if download_models():
        logger.info("All models downloaded successfully")
    else:
        logger.error("Failed to download some models")
        sys.exit(1)
