#!/bin/bash
echo "🚀 Starting ML Prediction Service..."
echo "Installing dependencies..."
pip install -r requirements.txt

echo "Creating data directory..."
mkdir -p data

echo "Starting Flask server..."
python app.py