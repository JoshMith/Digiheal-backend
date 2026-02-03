# ML Service Documentation - DKUT Medical Center
## Current Implementation (Heuristic Duration Prediction Model)

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Heuristic Model](#heuristic-model)
4. [API Endpoints](#api-endpoints)
5. [Database Integration](#database-integration)
6. [Frontend Integration](#frontend-integration)
7. [Running the Service](#running-the-service)

---

## 🎯 Overview

### **Purpose**
Predict consultation duration for appointment scheduling and queue management.

### **Current Model**
- **Version:** v0.1-heuristic
- **Type:** Rule-based prediction
- **Confidence:** 65%
- **Training Required:** No
- **Response Time:** <50ms

### **No Frontend Assessment**
⚠️ **Important:** The frontend does NOT perform health assessments.  
✅ Frontend ONLY displays prediction accuracy analytics.  
✅ All predictions happen via backend API calls to ML service.

---

## 🏗️ Architecture

```
Frontend (React)
    │
    │ Display analytics only
    ▼
Backend (Express)
    │
    │ POST /predict
    ▼
ML Service (Flask:5000)
    │
    │ Heuristic calculation
    ▼
Database (PostgreSQL)
    └── Stores predictions & actuals
```

---

## 🤖 Heuristic Model

### **Prediction Formula:**

```python
predicted = (base_duration * priority_mult * time_mult) + symptom_time
```

### **Components:**

#### 1. Base Duration by Department
```python
{
    'GENERAL_MEDICINE': 15,
    'EMERGENCY': 25,
    'PEDIATRICS': 20,
    'MENTAL_HEALTH': 45,
    'DENTAL': 30
}
```

#### 2. Priority Multipliers
```python
{
    'LOW': 0.8,      # -20%
    'NORMAL': 1.0,   # baseline
    'HIGH': 1.5,     # +50%
    'URGENT': 2.0    # +100%
}
```

#### 3. Time-of-Day Adjustments
```python
if 8 <= hour <= 11:   time_mult = 0.9   # Morning efficiency
elif 12 <= hour <= 14: time_mult = 1.1   # Lunch slowdown
else:                  time_mult = 1.0   # Standard
```

#### 4. Symptom Complexity
```python
symptom_time = symptom_count * 2.5 minutes
```

### **Example Calculation:**

```
Input:
  Department: GENERAL_MEDICINE
  Priority: HIGH
  Time: 10:00 AM
  Symptoms: 3

Calculation:
  base = 15
  priority_mult = 1.5
  time_mult = 0.9
  symptom_time = 3 * 2.5 = 7.5
  
  predicted = (15 * 1.5 * 0.9) + 7.5
            = 20.25 + 7.5
            = 27.75 ≈ 28 minutes
```

---

## 🔌 API Endpoints

### **1. POST /predict**

Predict consultation duration.

**Request:**
```json
{
  "department": "GENERAL_MEDICINE",
  "priority": "NORMAL",
  "appointmentType": "SCHEDULED",
  "symptomCount": 3,
  "timeOfDay": 10
}
```

**Response:**
```json
{
  "predictedDuration": 25,
  "confidence": 0.65,
  "modelVersion": "v0.1-heuristic"
}
```

**Fields:**
| Field | Type | Required | Values |
|-------|------|----------|--------|
| department | string | Yes | GENERAL_MEDICINE, EMERGENCY, PEDIATRICS, MENTAL_HEALTH, DENTAL, PHARMACY, LABORATORY |
| priority | string | Yes | LOW, NORMAL, HIGH, URGENT |
| appointmentType | string | Yes | WALK_IN, SCHEDULED, FOLLOW_UP, EMERGENCY, ROUTINE_CHECKUP |
| symptomCount | int | No | Default: 1 |
| timeOfDay | int | No | 0-23, Default: 12 |

---

### **2. POST /train**

Receive training data (currently saves to CSV for future use).

**Request:**
```json
{
  "data": [
    {
      "department": "GENERAL_MEDICINE",
      "priority": "NORMAL",
      "appointmentType": "SCHEDULED",
      "symptomCount": 3,
      "timeOfDay": 10,
      "dayOfWeek": 2,
      "actualDuration": 28
    }
  ]
}
```

**Response:**
```json
{
  "message": "Received 150 training samples",
  "savedTo": "data/training_20260203_143022.csv",
  "nextStep": "Implement scikit-learn training in trainer.py"
}
```

---

### **3. GET /health**

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model": "v0.1-heuristic",
  "timestamp": "2026-02-03T14:30:45.123Z"
}
```

---

## 💾 Database Integration

### **Appointment Model**
```prisma
model Appointment {
  duration        Int    @default(30)  // Uses predicted duration
  department      Department
  type            AppointmentType
  priority        PriorityLevel
  // ...
}
```

### **Interaction Model (Key for ML)**
```prisma
model Interaction {
  appointmentId        String   @unique
  department           Department
  priority             PriorityLevel
  appointmentType      AppointmentType
  symptomCount         Int      @default(0)
  
  // Timestamps
  checkInTime          DateTime
  checkoutTime         DateTime?
  
  // Durations
  totalDuration        Int?     // Actual (ground truth)
  predictedDuration    Int?     // ML prediction
}
```

### **Data Flow:**

```
1. Create Appointment
   ↓
2. Call ML Service: POST /predict
   ↓
3. Store predictedDuration in Interaction
   ↓
4. Consultation happens
   ↓
5. Calculate totalDuration
   ↓
6. Store actual duration
   ↓
7. Export for training: GET /api/interactions/export
   ↓
8. Send to ML Service: POST /train
   ↓
9. ML service saves to CSV (future training)
```

---

## 🎨 Frontend Integration

### **What Frontend Does:**

✅ **Displays Analytics** - Shows prediction accuracy metrics  
❌ **NO Health Assessment** - Removed from frontend  
❌ **NO Direct ML Calls** - All via backend

### **Analytics Display:**

```typescript
// Component: PredictionAccuracyChart.tsx
import { analyticsApi } from '@/api';

const { data } = useQuery({
  queryKey: ['prediction-accuracy'],
  queryFn: () => analyticsApi.getPredictionAccuracy()
});

// Displays:
// - Overall accuracy percentage
// - Accuracy by department
// - Sample size
// - Accuracy trend
```

### **Backend Endpoint:**

```typescript
// GET /api/analytics/prediction-accuracy
{
  overallAccuracy: 0.72,
  totalSamples: 156,
  departmentStats: [
    { department: "GENERAL_MEDICINE", avgAccuracy: 0.75, sampleSize: 89 },
    { department: "EMERGENCY", avgAccuracy: 0.68, sampleSize: 34 }
  ],
  period: "all-time"
}
```

---

## 🚀 Running the Service

### **Setup:**

```bash
cd ml_service

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### **Start Service:**

```bash
python app.py
```

**Output:**
```
🤖 ML Service starting...
📊 Model: Heuristic v0.1
🔌 Endpoints:
   POST /predict    - Predict duration
   POST /train      - Receive training data
   GET  /health     - Health check
 * Running on http://0.0.0.0:5000
```

### **Test:**

```bash
# Health check
curl http://localhost:5000/health

# Prediction
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "department": "GENERAL_MEDICINE",
    "priority": "NORMAL",
    "appointmentType": "SCHEDULED",
    "symptomCount": 3,
    "timeOfDay": 10
  }'
```

---

## 📊 Current Performance

| Metric | Value |
|--------|-------|
| Model Type | Heuristic (Rule-based) |
| Confidence | 65% (fixed) |
| Response Time | <50ms |
| MAE (estimated) | ~8 minutes |
| Training Data Needed | No |

---

## 📁 File Structure

```
ml_service/
├── app.py              # Main Flask app (current)
├── trainer.py          # ML training module (future)
├── test_ml_service.py  # Unit tests (future)
├── requirements.txt    # Dependencies
├── data/               # Training data
│   └── training_*.csv
└── models/             # Trained models (future)
```

---

## 🎯 Key Points

### **Current Implementation:**
- ✅ Heuristic model provides immediate predictions
- ✅ No training data required
- ✅ Reasonable accuracy (~65%)
- ✅ Collects data for future ML training

### **Frontend:**
- ❌ No health assessment on frontend
- ✅ Only displays analytics
- ✅ All predictions via backend

### **Future:**
- 📝 Will train ML models using collected data
- 📝 Improve accuracy with RandomForest/GradientBoosting
- 📝 Add disease classification (future feature)

---

**Version:** v0.1-heuristic  
**Status:** Production Ready  
**Last Updated:** 2026-02-03