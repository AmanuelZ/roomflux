#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Check if model files exist
echo "Checking model files..."
MODEL_FILES=(
  "/app/models/checkpoints/resnet101-63fe2227.pth"
  "/app/wall_segmentation/weights/model_final.pth"
  "/app/wall_estimation/weight/model_best.pth"
)

MISSING_FILES=0
for file in "${MODEL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Warning: Missing model file: $file"
    MISSING_FILES=1
    
    # Try to download missing files
    if [[ "$file" == *"resnet101-63fe2227.pth"* ]]; then
      echo "Attempting to download ResNet101 model..."
      python -c "import torch; torch.hub.load('pytorch/vision:v0.10.0', 'resnet101', pretrained=True)"
    fi
  else
    echo "Found model file: $file"
  fi
done

if [ $MISSING_FILES -eq 1 ]; then
  echo "Some model files are missing. The application may not work correctly."
fi

# Run database migrations
echo "Running database migrations..."
cd /app
alembic upgrade head

# Verify database schema matches models
python -c "from database.verify_schema import verify_schema; verify_schema()" || echo "Warning: Database schema verification failed"


# Set superadmin if specified
if [ ! -z "$SUPERADMIN_EMAIL" ]; then
  echo "Setting superadmin: $SUPERADMIN_EMAIL"
  python scripts/set_superadmin.py "$SUPERADMIN_EMAIL" || echo "Failed to set superadmin"
fi

# Start the application
echo "Starting application..."
PYTHONPATH=/app uvicorn main:app --host 0.0.0.0 --port 80
