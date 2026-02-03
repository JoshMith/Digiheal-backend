# app.py - Updated version
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime
import joblib
import os

# Import DurationPredictor if available
try:
    from trainer import DurationPredictor
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("⚠️ trainer.py not available - using heuristic only")

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

# Initialize model - try to load trained ML model first
model = None
model_type = "heuristic"

if ML_AVAILABLE:
    try:
        # Try to load trained model
        model = DurationPredictor.load_model('models/duration_predictor.pkl')
        model_type = "ml-trained"
        print(f"✅ Loaded trained ML model: {model.version}")
        
        # Load metadata to show performance
        try:
            import json
            with open('models/metadata.json', 'r') as f:
                metadata = json.load(f)
                print(f"📊 Model performance: MAE = {metadata['metrics']['mae']:.2f} min, R² = {metadata['metrics']['r2']:.3f}")
        except:
            print("📊 Model metadata not available")
            
    except FileNotFoundError:
        print("⚠️  No trained model found, using heuristic")
        model = HeuristicModel()
    except Exception as e:
        print(f"⚠️  Error loading ML model: {e}, using heuristic")
        model = HeuristicModel()
else:
    model = HeuristicModel()

print(f"📊 Active model: {model_type}")

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
                    'modelVersion': model.version,
                    'modelType': model_type
                }), 400
        
        # Prepare features based on model type
        if model_type == "ml-trained":
            # ML model requires more features
            features = {
                'department': data['department'],
                'priority': data['priority'],
                'appointmentType': data['appointmentType'],
                'symptomCount': data.get('symptomCount', 1),
                'timeOfDay': data.get('timeOfDay', 12),
                'dayOfWeek': data.get('dayOfWeek', datetime.now().weekday())
            }
        else:
            # Heuristic model
            features = {
                'department': data['department'],
                'priority': data['priority'],
                'appointmentType': data['appointmentType'],
                'symptomCount': data.get('symptomCount', 1),
                'timeOfDay': data.get('timeOfDay', 12)
            }
        
        # Make prediction
        result = model.predict(features)
        result['modelType'] = model_type  # Add model type to response
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'predictedDuration': 20,
            'confidence': 0.1,
            'modelVersion': 'error-fallback',
            'modelType': 'fallback'
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
        
        # Check if we should trigger ML training
        if len(data) >= 50 and ML_AVAILABLE:
            # Suggest running trainer.py manually
            return jsonify({
                'message': f'Received {len(data)} training samples',
                'savedTo': filename,
                'trainingSuggestion': f'Run trainer.py to train new ML model (now has {len(data) + 81} total samples)',
                'command': 'cd ml_service && python trainer.py',
                'currentModelPerformance': 'MAE: 7.52 min, R²: 0.191'
            })
        
        # In future: Train actual model here
        # For now, just acknowledge receipt
        return jsonify({
            'message': f'Received {len(data)} training samples',
            'savedTo': filename,
            'nextStep': f'Run trainer.py when you have at least 50 new samples (currently {len(data)})'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about current model"""
    try:
        import json
        with open('models/metadata.json', 'r') as f:
            metadata = json.load(f)
            metrics = metadata['metrics']
    except:
        metrics = {'mae': 'unknown', 'r2': 'unknown'}
    
    return jsonify({
        'modelType': model_type,
        'modelVersion': model.version,
        'requiresDayOfWeek': model_type == "ml-trained",
        'performance': {
            'mae': metrics.get('mae', 'unknown'),
            'r2': metrics.get('r2', 'unknown')
        },
        'trainingSamples': 81 if model_type == "ml-trained" else 0,
        'confidence': 0.65 if model_type == "heuristic" else "variable",
        'suggestedRetraining': len(os.listdir('data')) > 0 if os.path.exists('data') else False
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': model.version,
        'modelType': model_type,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("="*60)
    print("🤖 DKUT Medical Center - ML Service")
    print("="*60)
    print(f"📊 Model: {model_type} - {model.version}")
    print("🔌 Endpoints:")
    print("   POST /predict    - Predict consultation duration")
    print("   POST /train      - Receive training data")
    print("   GET  /model-info - Get model information")
    print("   GET  /health     - Health check")
    print("="*60)
    app.run(debug=True, port=5000, host='0.0.0.0')