#!/bin/bash
# Trading Bot Pro — Quick Start Script

echo "🤖 Trading Bot Pro — Starting all services..."

# Check prerequisites
command -v node  >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from nodejs.org"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 not found. Install from python.org"; exit 1; }
command -v mongod >/dev/null 2>&1 || echo "⚠️  mongod not found. Make sure MongoDB is running."

# Start MongoDB (if not running)
mongod --fork --logpath /tmp/mongod.log 2>/dev/null || echo "MongoDB may already be running."

# Install deps if node_modules missing
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend deps..."
  cd backend && npm install && cd ..
fi
if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend deps..."
  cd frontend && npm install && cd ..
fi

# Check .env files
[ ! -f "backend/.env" ]  && cp backend/.env.example  backend/.env  && echo "⚠️  backend/.env created — please fill in your API keys"
[ ! -f "bot/.env"     ]  && cp bot/.env.example       bot/.env      && echo "⚠️  bot/.env created — please fill in your API keys"

echo ""
echo "Starting services..."
echo ""

# Start backend
echo "▶ Backend  → http://localhost:5000"
cd backend && npm run dev &
BACKEND_PID=$!

# Start frontend
echo "▶ Frontend → http://localhost:5173"
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Dashboard: http://localhost:5173"
echo "✅ API:       http://localhost:5000/api/health"
echo ""
echo "To start Python bot separately:"
echo "  cd bot && pip install -r requirements.txt && python main.py"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT
wait
