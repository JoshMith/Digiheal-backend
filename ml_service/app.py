from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
import joblib
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize with heuristic model
class HeuristicModel:
    def __init__(self):
        self.version = "v0.1-heuristic"
        self.trained = False
        
    def predict(self, features):
        """Predict duration using simple rules"""
        dept = features.get('department', 'GENERAL_MEDICINE')
        priority = features.get('priority', 'NORMAL')
        app_type = features.get('appointmentType', 'ROUTINE')
        symptoms = features.get('symptomCount', 1)
        
        # Base times
        base_times = {
            'GENERAL_MEDICINE': 15,
            'EMERGENCY': 25,
            'PEDIATRICS': 20,
            'MENTAL_HEALTH': 45,
            'DENTAL': 30
        }
        
        base = base_times.get(dept, 15)
        
        # Priority multipliers
        priority_mult = {
            'LOW': 0.8,
            'NORMAL': 1.0,
            'HIGH': 1.5,
            'URGENT': 2.0
        }
        
        mult = priority_mult.get(priority, 1.0)
        
        # Symptom complexity
        symptom_time = symptoms * 2.5
        
        # Time of day adjustments (mornings are faster)
        hour = features.get('timeOfDay', 12)
        if 8 <= hour <= 11:
            time_mult = 0.9  # Morning efficiency
        elif 12 <= hour <= 14:
            time_mult = 1.1  # Lunch slowdown
        else:
            time_mult = 1.0
            
        predicted = int(base * mult * time_mult + symptom_time)
        
        return {
            'predictedDuration': max(5, min(predicted, 120)),  # Clamp 5-120 min
            'confidence': 0.65,
            'modelVersion': self.version
        }

model = HeuristicModel()

@app.route('/predict', methods=['POST'])
def predict():
    """Predict consultation duration"""
    try:
        data = request.json
        
        # Validate required fields
        required = ['department', 'priority', 'appointmentType']
        for field in required:
            if field not in data:
                return jsonify({
                    'error': f'Missing required field: {field}',
                    'predictedDuration': 20,
                    'confidence': 0.3,
                    'modelVersion': model.version
                }), 400
        
        # Make prediction
        result = model.predict(data)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'predictedDuration': 20,
            'confidence': 0.1,
            'modelVersion': 'error-fallback'
        }), 500

@app.route('/train', methods=['POST'])
def train():
    """Receive training data from backend"""
    try:
        data = request.json.get('data', [])
        
        if not data:
            return jsonify({'message': 'No training data provided'}), 400
        
        # Save training data
        df = pd.DataFrame(data)
        os.makedirs('data', exist_ok=True)
        
        filename = f"data/training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(filename, index=False)
        
        # In future: Train actual model here
        # For now, just acknowledge receipt
        return jsonify({
            'message': f'Received {len(data)} training samples',
            'savedTo': filename,
            'nextStep': 'Implement scikit-learn training in trainer.py'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': model.version,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🤖 ML Service starting...")
    print("📊 Model: Heuristic v0.1")
    print("🔌 Endpoints:")
    print("   POST /predict    - Predict duration")
    print("   POST /train      - Receive training data")
    print("   GET  /health     - Health check")
    app.run(debug=True, port=5000, host='0.0.0.0')