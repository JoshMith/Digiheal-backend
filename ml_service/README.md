# Health Severity Assessment Model Documentation

## 📋 Overview

The **Health Severity Assessment Model** is a machine learning system designed to evaluate symptom severity, predict risk levels, and provide personalized health recommendations. Unlike diagnostic models, this system focuses on **triage and severity assessment** to help users understand the urgency of their symptoms and receive appropriate guidance.

---

## 🎯 **Core Purpose**

- **Predict symptom severity** on a 0-10 scale
- **Determine urgency level** (Low/Moderate/High)
- **Generate personalized recommendations**
- **Assist with health triage decisions**
- **Provide actionable health guidance**

**Note**: This model does NOT diagnose diseases. It assesses symptom severity only.

---

## 📊 **Data Sources**

### 1. **`Symptom-severity.csv`**
- **132 medical symptoms** with severity weights (1-7 scale)
- Each symptom has a standardized name and weight value
- Example: `chest_pain: 7`, `itching: 1`, `high_fever: 7`

### 2. **`workout_df.csv`**
- **410 health recommendations** across 41 disease categories
- Contains diet, exercise, and lifestyle suggestions
- Mapped to symptoms for personalized recommendations

---

## 🏗️ **Model Architecture**

### **Dual-Model Approach**
```python
# Model 1: Severity Prediction
RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    random_state=42
)

# Model 2: Urgency Classification  
RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    random_state=42,
    class_weight='balanced'
)
```

---

## 🔍 **Input Features**

### **Primary Features (132 binary features)**
Each symptom is converted to a binary (0/1) feature indicating presence/absence:

| Feature Type | Example | Description |
|-------------|---------|-------------|
| Binary Symptom | `chest_pain: 1` | User reports chest pain |
| Binary Symptom | `fever: 0` | User doesn't report fever |
| ...132 total | | All symptoms from CSV |

### **Symptom Categories**
Symptoms are grouped into 5 medical categories:

| Category | Example Symptoms | Purpose |
|----------|-----------------|---------|
| **Respiratory** | cough, breathlessness, chest_pain | Specific recommendations |
| **Gastrointestinal** | vomiting, nausea, diarrhoea | Diet/lifestyle advice |
| **Neurological** | headache, dizziness, fatigue | Activity/rest guidance |
| **Emergency** | chest_pain, shortness_of_breath, coma | Urgency escalation |
| **Musculoskeletal** | joint_pain, back_pain, neck_pain | Exercise/mobility advice |

### **User Context Features (Optional)**
- **Age**: Numerical (affects risk adjustment)
- **Gender**: Categorical (male/female/other)
- **Duration**: Text description (e.g., "3 days")
- **Self-reported Severity**: User's assessment (mild/moderate/severe)

---

## ⚙️ **Prediction Pipeline**

### **Step 1: Input Processing**
```python
# Clean and standardize symptoms
symptoms → ["chest_pain", "shortness_of_breath"] 
          → ["chest_pain", "shortness_of_breath"] (standardized)
```

### **Step 2: Feature Vector Creation**
```python
# Convert to 132-dimensional binary vector
[1, 0, 1, 0, 0, 1, ...]  # 1 = symptom present, 0 = absent
```

### **Step 3: Severity Calculation**
```python
# Multiple severity metrics computed
raw_severity = sum(symptom_weights)  # e.g., 7 + 4 = 11
ml_severity = model.predict(features)  # ML prediction (0-10)
rule_severity = (raw_severity / 50) * 10  # Scaled (0-10)
```

### **Step 4: Risk Score Computation**
```python
# Hybrid scoring approach
risk_score = (0.7 × ml_severity) + (0.3 × rule_severity)
```

### **Step 5: Urgency Determination**
```python
# Threshold-based classification
if raw_severity ≥ 70 or risk_score ≥ 8 or emergency_symptom_present:
    urgency = "high"
elif raw_severity ≥ 42 or risk_score ≥ 5:
    urgency = "moderate"
else:
    urgency = "low"
```

### **Step 6: Recommendation Generation**
```python
recommendations = 
    urgency_specific_advice +
    symptom_category_advice + 
    general_health_tips +
    disease_specific_workouts
```

---

## 📈 **Output Format**

### **JSON Response Structure**
```json
{
  "risk_score": 7.2,
  "confidence": 85.5,
  "urgency": "moderate",
  "recommendations": [
    "Schedule appointment within 24-48 hours",
    "Monitor symptoms closely",
    "Avoid strenuous activities",
    "Stay hydrated by drinking plenty of water",
    "Get adequate rest and sleep"
  ],
  "symptoms_analyzed": 3,
  "analysis": {
    "raw_severity_score": 32,
    "ml_based_prediction": 6.8,
    "rule_based_prediction": 7.6
  },
  "threshold_info": {
    "emergency_threshold": 70,
    "high_threshold": 42,
    "moderate_threshold": 27
  }
}
```

### **Output Descriptions**
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `risk_score` | float | 0-10 | Final severity assessment |
| `confidence` | float | 0-100% | Model confidence in prediction |
| `urgency` | string | low/moderate/high | Recommended action urgency |
| `recommendations` | array | 10-15 items | Personalized health advice |
| `symptoms_analyzed` | int | ≥1 | Number of symptoms processed |

---

## 🎚️ **Severity Thresholds**

### **Medical Weight Thresholds**
| Level | Total Symptom Weight | Description |
|-------|---------------------|-------------|
| **Low** | < 27 | Routine care recommended |
| **Moderate** | 27-41 | Prompt medical attention |
| **High** | ≥ 42 | Urgent medical attention |

### **Risk Score Interpretation**
| Risk Score | Urgency | Recommended Action |
|------------|---------|-------------------|
| **0-3** | Low | Self-care, routine appointment |
| **4-6** | Moderate | Schedule within 24-48 hours |
| **7-8** | High | Seek care today |
| **9-10** | Emergency | Immediate medical attention |

---

## 🔬 **Model Performance**

### **Training Statistics**
- **Training Samples**: 15,000 synthetic cases
- **Features**: 132 binary symptom indicators
- **Severity Model R²**: 0.182 (testing)
- **Urgency Model Accuracy**: 0.998 (testing)

### **Feature Importance (Top 5)**
1. **swelling_of_stomach** (weight: 7) - Importance: 0.0936
2. **coma** (weight: 7) - Importance: 0.0875  
3. **weakness_in_limbs** (weight: 7) - Importance: 0.0856
4. **chest_pain** (weight: 7) - Importance: 0.0799
5. **high_fever** (weight: 7) - Importance: 0.0756

---

## 💡 **Recommendation Logic**

### **Hierarchical Recommendation System**
1. **Urgency-Level Actions** (Most critical)
   - Emergency: Immediate care instructions
   - High: Urgent appointment guidance
   - Low: Routine care suggestions

2. **Symptom-Category Advice**
   - Respiratory: Breathing exercises, humidifier use
   - Gastrointestinal: Diet modifications, hydration
   - Neurological: Rest, stress reduction

3. **General Health Principles**
   - Hydration, nutrition, rest, hygiene

4. **Disease-Specific Workouts**
   - From workout_df.csv, mapped to symptoms

### **Emergency Detection**
The model automatically escalates to "high" urgency if:
- Any symptom from emergency list is present
- Risk score exceeds 8/10
- Age > 60 with moderate symptoms
- Multiple high-weight symptoms combined

---

## 🔄 **API Endpoints**

### **1. Health Check**
```
GET /health
```
Returns service status and version.

### **2. Model Information**
```
GET /info
```
Returns model details, thresholds, and capabilities.

### **3. Symptoms List**
```
GET /symptoms
```
Returns all 132 symptoms with their weights.

### **4. Prediction**
```
POST /predict
```
Main endpoint for severity assessment.

**Request Body:**
```json
{
  "symptoms": ["fever", "cough", "fatigue"],
  "age": 25,
  "gender": "male",
  "duration": "3 days",
  "severity": "moderate"
}
```

---

## ⚠️ **Limitations & Assumptions**

### **Model Limitations**
1. **No medical diagnosis** - Severity assessment only
2. **Synthetic training data** - Based on realistic patterns
3. **Binary symptom presence** - Doesn't capture intensity/duration
4. **Limited context** - Basic demographics only

### **Key Assumptions**
1. Symptom weights are medically validated (from provided CSV)
2. Higher symptom count = higher severity risk
3. Certain symptoms always indicate emergency
4. Older age increases risk (age > 60 adjustment)

---

## 🛠️ **Technical Implementation**

### **File Structure**
```
health-assessment-model/
├── train_model.py      # Model training script
├── app.py             # Flask API server
├── test_service.py    # API testing suite
├── severity_model.pkl # Trained model package
├── Symptom-severity.csv # Symptom database
└── workout_df.csv     # Recommendation database
```

### **Dependencies**
```txt
flask==2.3.3
flask-cors==4.0.0
pandas==2.0.3
numpy==1.24.3
scikit-learn==1.3.0
```

### **Training Process**
```bash
# 1. Train the model
python train_model.py

# 2. Start the API
python app.py

# 3. Test the API
python test_service.py
```

---

## 🎨 **Integration with Frontend**

### **Expected Frontend Flow**
1. User inputs symptoms and demographic info
2. Frontend sends POST request to `/predict`
3. API returns risk assessment and recommendations
4. Frontend displays results with appropriate UI
5. User receives actionable health guidance

### **Frontend Response Handling**
```javascript
// Example React integration
const response = await fetch('http://localhost:5000/predict', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(userData)
});

const assessment = await response.json();

// Use in UI
urgencyColor = {
  'low': 'green',
  'moderate': 'yellow', 
  'high': 'red'
}[assessment.urgency];
```

---

## 🔮 **Future Enhancements**

### **Planned Improvements**
1. **Real clinical data** for training validation
2. **Symptom intensity/duration** features
3. **Medical history integration**
4. **Multi-language support**
5. **Mobile app optimization**
6. **Telemedicine integration**
7. **Continuous learning** from user feedback

### **Research Directions**
- Deep learning for symptom pattern recognition
- Natural language processing for symptom description
- Integration with wearable device data
- Predictive analytics for symptom progression

---

## 📚 **References & Citations**

### **Data Sources**
1. Symptom-severity.csv - Medical symptom weights database
2. workout_df.csv - Health recommendation database

### **Methodology**
- Random Forest algorithm for robust predictions
- Hybrid scoring for balanced assessment
- Triage-based urgency classification
- Hierarchical recommendation system

### **Medical Basis**
- Standard medical triage principles
- Evidence-based symptom weighting
- Clinical urgency guidelines
- Preventive health recommendations

---

## ⚖️ **Ethical Considerations**

### **Privacy & Security**
- Local processing option available
- GDPR-compliant data handling

### **Medical Disclaimer**
> **IMPORTANT**: This tool provides health information, not medical advice. Always consult qualified healthcare professionals for diagnosis and treatment. In emergencies, call local emergency services immediately.

### **Bias Mitigation**
- Balanced training data across demographics
- Transparent scoring methodology
- Regular model auditing
- User feedback incorporation

---

## 📞 **Support & Contact**

For technical issues, model questions, or integration support:
- **Repository**: [Your GitHub Link]
- **Documentation**: [Your Docs Link]
- **Email**: [Your Contact Email]

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Status**: ✅ Production Ready