#!/bin/bash
# Quick Start Script for DKUT ML Service
# Run this script to set up and start the ML service

set -e  # Exit on error

echo "======================================"
echo "  DKUT ML Service - Quick Start"
echo "======================================"
echo ""

# Check if we're in the ml_service directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found"
    echo "Please run this script from the ml_service directory:"
    echo "  cd ml_service"
    echo "  ./start.sh"
    exit 1
fi

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/Scripts/activate
echo "✅ Virtual environment activated"
echo ""

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip --quiet
echo "✅ pip upgraded"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt --quiet
echo "✅ Dependencies installed"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p models
echo "✅ Directories created"
echo ""

# Copy .env.example if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (please configure if needed)"
else
    echo "✅ .env file already exists"
fi
echo ""

# Verify installation
echo "🔍 Verifying installation..."
python3 -c "import flask; import numpy; import sklearn; print('✅ All packages imported successfully')"
echo ""

# Start the service
echo "======================================"
echo "  Starting ML Service"
echo "======================================"
echo ""
echo "Service will run on: http://localhost:5000"
echo ""
echo "Available endpoints:"
echo "  GET  /health   - Health check"
echo "  GET  /info     - Model information"
echo "  POST /predict  - Disease prediction"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

# Run Flask app
python app.py