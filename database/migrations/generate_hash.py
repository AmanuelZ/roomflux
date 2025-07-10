from passlib.hash import sha256_crypt
import sys

def generate_hash(password):
    """Generate a SHA-256 hash for the given password."""
    hash = sha256_crypt.hash(password)
    print(f"Password: {password}")
    print(f"Hash: {hash}")
    return hash

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_hash.py <password>")
        sys.exit(1)
    
    password = sys.argv[1]
    generate_hash(password)
