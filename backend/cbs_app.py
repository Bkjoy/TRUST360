import uvicorn
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cbs.server import cbs_app

if __name__ == "__main__":
    print("==================================================================")
    print("Starting Simulated Core Banking System (CBS) Service on port 8001")
    print("Health check: http://127.0.0.1:8001/cbs/health")
    print("Verification API: http://127.0.0.1:8001/cbs/api/v1/verify")
    print("==================================================================")
    uvicorn.run("cbs.server:cbs_app", host="127.0.0.1", port=8001, reload=False)
