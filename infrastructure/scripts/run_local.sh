#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "    DEPOSIT360: AICTE Security Deposit & FDR Platform     "
echo "        Smart India Hackathon 2026 Prototype              "
echo "=========================================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "[1/3] Setting up Python virtual environment..."
cd "$ROOT_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

echo "[2/3] Setting up Frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install

echo "[3/3] Launching local servers..."
echo "Starting Backend on http://localhost:8000..."
cd "$ROOT_DIR/backend"
python3 -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend on http://localhost:5173..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

echo ""
echo "=========================================================="
echo "DEPOSIT360 is live!"
echo "Frontend:  http://localhost:5173"
echo "API Docs:  http://localhost:8000/docs"
echo "Demo Login Accounts:"
echo "  - Super Admin:          admin@aicte.gov.in / Admin@123"
echo "  - Scrutiny Officer:     officer@aicte.gov.in / Officer@123"
echo "  - Competent Authority:  authority@aicte.gov.in / Authority@123"
echo "  - Institution Admin:    inst.admin@ditm.ac.in / Inst@123"
echo "=========================================================="

wait
