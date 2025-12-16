from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
from typing import List, Dict, Any
import traceback

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# =========================================
# 1️⃣ Load trained models
# =========================================
print("🚀 Loading ML models...")
try:
    with open("severity_model.pkl", "rb") as f:
        model_data = pickle.load(f)
    
    severity_model = model_data['severity_model']
    urgency_model = model_data['urgency_model']
    symptoms_list = model_data['symptoms']
    symptom_weights = model_data['symptom_weights']
    symptom_categories = model_data['symptom_categories']
    symptom_to_category = model_data['symptom_to_category']
    general_workouts = model_data['general_workouts']
    urgency_recommendations = model_data['urgency_recommendations']
    disease_workouts = model_data['disease_workouts']
    
    # Thresholds
    EMERGENCY_THRESHOLD = model_data.get('emergency_threshold', 70)
    HIGH_THRESHOLD = model_data.get('high_threshold', 42)
    MODERATE_THRESHOLD = model_data.get('moderate_threshold', 27)
    MAX_REALISTIC_SCORE = model_data.get('max_realistic_score', 50)
    
    print(f"✅ Models loaded successfully!")
    print(f"   - {len(symptoms_list)} symptoms")
    print(f"   - Emergency threshold: {EMERGENCY_THRESHOLD}+ total weight")
    print(f"   - Scaling: 0-{MAX_REALISTIC_SCORE} → 0-10")
    
except Exception as e:
    print(f"❌ Error loading models: {e}")
    exit(1)

# =========================================
# 2️⃣ Helper Functions
# =========================================
def clean_symptom_name(symptom: str) -> str:
    """Clean and standardize symptom names"""
    return (
        str(symptom)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace(".", "")
        .replace("-", "_")
    )

def create_feature_vector(symptoms: List[str]) -> np.ndarray:
    """Create binary feature vector from symptoms"""
    cleaned_symptoms = [clean_symptom_name(s) for s in symptoms]
    feature_vector = [1 if symptom in cleaned_symptoms else 0 for symptom in symptoms_list]
    return np.array(feature_vector).reshape(1, -1)

def calculate_raw_severity(symptoms: List[str]) -> float:
    """Calculate raw severity score from symptom weights"""
    cleaned_symptoms = [clean_symptom_name(s) for s in symptoms]
    total_weight = sum(symptom_weights.get(s, 0) for s in cleaned_symptoms if s in symptom_weights)
    return total_weight

def calculate_risk_score(raw_severity: float, ml_severity: float = None) -> float:
    """Convert raw severity to risk score 0-10"""
    # Use ML prediction if available, otherwise use rule-based
    if ml_severity is not None:
        risk_score = ml_severity
    else:
        # Scale raw severity to 0-10
        if raw_severity > MAX_REALISTIC_SCORE:
            risk_score = 10.0
        else:
            risk_score = (raw_severity / MAX_REALISTIC_SCORE) * 10
    
    # Ensure within bounds
    risk_score = max(0, min(10, risk_score))
    return round(risk_score, 1)

def predict_severity_and_urgency(symptoms: List[str]) -> Dict[str, Any]:
    """Predict severity and urgency"""
    if not symptoms:
        return {"risk_score": 0, "ml_severity": 0, "raw_severity": 0}
    
    try:
        # Create feature vector
        X = create_feature_vector(symptoms)
        
        # Predict ML severity
        ml_severity = float(severity_model.predict(X)[0])
        ml_severity = max(0, min(10, ml_severity))
        
        # Calculate raw severity
        raw_severity = calculate_raw_severity(symptoms)
        
        # Predict urgency
        urgency_pred = urgency_model.predict(X)[0]
        urgency_proba = urgency_model.predict_proba(X)[0]
        
        # Calculate confidence
        confidence = round(max(urgency_proba) * 100, 1)
        
        # Calculate final risk score (70% ML, 30% rule-based)
        rule_based_score = calculate_risk_score(raw_severity)
        risk_score = round(ml_severity * 0.7 + rule_based_score * 0.3, 1)
        
        return {
            "risk_score": risk_score,
            "confidence": confidence,
            "ml_severity": round(ml_severity, 2),
            "raw_severity": raw_severity,
            "rule_based_score": rule_based_score,
            "urgency_pred": int(urgency_pred)
        }
        
    except Exception as e:
        print(f"Prediction error: {e}")
        # Fallback to rule-based calculation
        raw_severity = calculate_raw_severity(symptoms)
        risk_score = calculate_risk_score(raw_severity)
        return {
            "risk_score": risk_score,
            "confidence": 75.0,
            "ml_severity": risk_score,
            "raw_severity": raw_severity,
            "rule_based_score": risk_score,
            "urgency_pred": 0 if risk_score < 3 else 1 if risk_score < 7 else 2
        }

def determine_urgency_level(raw_severity: float, risk_score: float, symptoms: List[str]) -> str:
    """Determine urgency level with emergency detection"""
    cleaned_symptoms = [clean_symptom_name(s) for s in symptoms]
    
    # Check for specific emergency symptoms
    emergency_symptoms = [
        "chest_pain", "severe_chest_pain", "shortness_of_breath", 
        "difficulty_breathing", "passing_out", "coma", "stroke",
        "heart_attack", "severe_bleeding", "severe_head_injury"
    ]
    
    has_emergency_symptom = any(s in cleaned_symptoms for s in emergency_symptoms)
    
    # Determine urgency based on thresholds and risk score
    if has_emergency_symptom or raw_severity >= EMERGENCY_THRESHOLD or risk_score >= 8:
        return "high"
    elif raw_severity >= HIGH_THRESHOLD or risk_score >= 5:
        return "moderate"
    else:
        return "low"

def get_recommendations(symptoms: List[str], urgency: str, risk_score: float) -> List[str]:
    """Get personalized recommendations based on symptoms and urgency"""
    cleaned_symptoms = [clean_symptom_name(s) for s in symptoms]
    
    recommendations = []
    
    # 1. Add urgency-specific recommendations
    recommendations.extend(urgency_recommendations.get(urgency, []))
    
    # 2. Add category-specific recommendations
    symptom_categories_found = set()
    for symptom in cleaned_symptoms:
        if symptom in symptom_to_category:
            symptom_categories_found.add(symptom_to_category[symptom])
    
    for category in symptom_categories_found:
        if category == "respiratory":
            recommendations.extend([
                "Use a humidifier to ease breathing",
                "Avoid smoking and air pollutants",
                "Practice deep breathing exercises",
                "Stay in well-ventilated areas"
            ])
        elif category == "gastrointestinal":
            recommendations.extend([
                "Eat bland foods (bananas, rice, applesauce, toast)",
                "Avoid spicy, fatty, and dairy foods",
                "Stay hydrated with electrolyte solutions",
                "Eat small, frequent meals"
            ])
        elif category == "neurological":
            recommendations.extend([
                "Avoid bright lights and loud noises",
                "Practice relaxation techniques (meditation, deep breathing)",
                "Maintain a regular sleep schedule",
                "Limit screen time"
            ])
        elif category == "musculoskeletal":
            recommendations.extend([
                "Apply ice or heat as appropriate",
                "Practice gentle stretching",
                "Maintain good posture",
                "Avoid heavy lifting"
            ])
    
    # 3. Add general health recommendations
    recommendations.extend(general_workouts)
    
    # 4. Add specific workout recommendations from CSV
    # Find workouts for symptoms with matching disease patterns
    for symptom in cleaned_symptoms:
        # Look for diseases that might be related to this symptom
        for disease, workouts in disease_workouts.items():
            if symptom.lower() in disease.lower() or any(symptom in w.lower() for w in workouts[:3]):
                # Add unique workouts
                for workout in workouts[:5]:  # Take up to 5 per disease
                    if workout not in recommendations and len(recommendations) < 15:
                        recommendations.append(workout)
    
    # 5. Add risk-specific advice
    if risk_score >= 8:
        recommendations.extend([
            "🚨 DO NOT DELAY - Seek emergency care immediately",
            "Have someone drive you to the hospital",
            "Keep your phone charged and nearby",
            "Inform someone of your situation"
        ])
    elif risk_score >= 5:
        recommendations.extend([
            "Schedule medical appointment within 24 hours",
            "Avoid driving if feeling unwell",
            "Keep a symptom diary",
            "Check temperature regularly"
        ])
    else:
        recommendations.extend([
            "Monitor symptoms for changes",
            "Consider telemedicine consultation",
            "Practice good self-care",
            "Follow up if symptoms persist beyond 3 days"
        ])
    
    # Ensure unique recommendations
    unique_recs = []
    seen = set()
    for rec in recommendations:
        if rec not in seen:
            seen.add(rec)
            unique_recs.append(rec)
    
    return unique_recs[:15]  # Return top 15 most relevant

# =========================================
# 3️⃣ API Routes
# =========================================
@app.route("/")
def home():
    return "✅ Health Severity Assessment API is running"

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "health-severity-assessment",
        "version": "1.0.0"
    })

@app.route("/info", methods=["GET"])
def model_info():
    return jsonify({
        "model_type": f"{type(severity_model).__name__}/{type(urgency_model).__name__}",
        "version": "1.0.0",
        "symptoms_count": len(symptoms_list),
        "max_risk_score": 10.0,
        "min_risk_score": 0.0,
        "thresholds": {
            "emergency": EMERGENCY_THRESHOLD,
            "high": HIGH_THRESHOLD,
            "moderate": MODERATE_THRESHOLD
        }
    })

@app.route("/symptoms", methods=["GET"])
def list_symptoms():
    """Get all available symptoms with their weights"""
    symptoms_with_weights = [
        {"symptom": s, "weight": symptom_weights.get(s, 0)}
        for s in symptoms_list
    ]
    return jsonify({
        "symptoms": symptoms_with_weights,
        "count": len(symptoms_with_weights)
    })

@app.route("/predict", methods=["POST"])
def predict():
    """Predict severity, urgency, and recommendations"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or "symptoms" not in data:
            return jsonify({"error": "No symptoms provided"}), 400
        
        symptoms = data["symptoms"]
        if not isinstance(symptoms, list):
            return jsonify({"error": "Symptoms must be a list"}), 400
        
        if len(symptoms) == 0:
            return jsonify({"error": "Symptoms list cannot be empty"}), 400
        
        # Get additional information if provided
        age = data.get("age")
        gender = data.get("gender")
        duration = data.get("duration", "")
        severity_input = data.get("severity", "")
        
        # Predict severity and urgency
        prediction = predict_severity_and_urgency(symptoms)
        
        # Determine urgency level
        urgency = determine_urgency_level(
            prediction["raw_severity"], 
            prediction["risk_score"], 
            symptoms
        )
        
        # Get personalized recommendations
        recommendations = get_recommendations(symptoms, urgency, prediction["risk_score"])
        
        # Prepare response
        response = {
            "risk_score": prediction["risk_score"],
            "confidence": prediction["confidence"],
            "urgency": urgency,
            "recommendations": recommendations,
            "symptoms_analyzed": len(symptoms),
            "analysis": {
                "raw_severity_score": prediction["raw_severity"],
                "ml_based_prediction": prediction["ml_severity"],
                "rule_based_prediction": prediction["rule_based_score"]
            },
            "threshold_info": {
                "emergency_threshold": EMERGENCY_THRESHOLD,
                "high_threshold": HIGH_THRESHOLD,
                "moderate_threshold": MODERATE_THRESHOLD
            }
        }
        
        # Add optional fields if provided
        if age:
            response["age"] = int(age)
            # Adjust risk slightly based on age (higher risk for older adults)
            if int(age) > 60:
                response["risk_score"] = min(10, response["risk_score"] + 0.5)
                if urgency == "moderate":
                    response["urgency"] = "high"
                elif urgency == "low" and response["risk_score"] >= 5:
                    response["urgency"] = "moderate"
        
        if gender:
            response["gender"] = gender
        
        if duration:
            response["duration"] = duration
            
        if severity_input:
            response["user_reported_severity"] = severity_input
        
        return jsonify(response)
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# =========================================
# 4️⃣ Run Server
# =========================================
if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("🚀 Starting Health Severity Assessment API")
    print("=" * 50)
    app.run(host="127.0.0.1", port=5000, debug=True)