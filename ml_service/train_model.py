import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
import pickle
import warnings
warnings.filterwarnings('ignore')

print("=" * 60)
print("TRAINING SEVERITY & RECOMMENDATION MODEL")
print("=" * 60)

# ==========================
# 1️⃣ Load datasets
# ==========================
print("📂 Loading datasets...")
try:
    # Load symptom severity
    severity_df = pd.read_csv("Symptom-severity.csv")
    
    # Clean symptom names
    severity_df["Symptom"] = (
        severity_df["Symptom"]
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace(".", "", regex=False)
    )
    
    # Create weight dictionary
    symptom_weights = dict(zip(severity_df["Symptom"], severity_df["weight"]))
    max_symptom_weight = severity_df["weight"].max()
    
    # Load workouts
    workouts_df = pd.read_csv("workout_df.csv")
    workouts_df = workouts_df.loc[:, ~workouts_df.columns.str.contains("^Unnamed")]
    workouts_df.columns = workouts_df.columns.str.strip().str.lower().str.replace(" ", "_")
    
    # Clean workout disease names
    workouts_df["disease"] = workouts_df["disease"].str.strip().str.lower()
    
    # Create workout groups by disease
    disease_workouts = {}
    for disease, group in workouts_df.groupby("disease"):
        disease_workouts[disease] = group["workout"].tolist()
    
    print(f"✅ Loaded {len(symptom_weights)} symptoms")
    print(f"✅ Loaded {len(workouts_df)} workout recommendations")
    print(f"✅ Max symptom weight: {max_symptom_weight}")
    
except Exception as e:
    print(f"❌ Error loading datasets: {e}")
    exit(1)

# ==========================
# 2️⃣ Create realistic training data
# ==========================
print("\n🔨 Creating realistic training data...")

# Define symptom categories for more realistic combinations
symptom_categories = {
    "respiratory": ["cough", "breathlessness", "chest_pain", "shortness_of_breath", 
                    "high_fever", "mild_fever", "sore_throat", "runny_nose"],
    "gastrointestinal": ["vomiting", "nausea", "diarrhoea", "abdominal_pain", 
                        "stomach_pain", "constipation", "indigestion"],
    "neurological": ["headache", "dizziness", "migraine", "fatigue", "lethargy", 
                    "loss_of_balance", "blurred_vision", "vertigo"],
    "emergency": ["chest_pain", "severe_chest_pain", "shortness_of_breath", 
                  "coma", "stroke", "passing_out", "seizure"],
    "musculoskeletal": ["joint_pain", "back_pain", "neck_pain", "muscle_pain", 
                       "pain_in_anal_region", "painful_walking"]
}

symptoms_list = list(symptom_weights.keys())
np.random.seed(42)
num_samples = 10000

X = []
y_severity = []
y_urgency = []
y_recommendations = []

# Emergency thresholds based on real medical triage
EMERGENCY_THRESHOLD = 70  # Total weight > 70 = emergency
HIGH_THRESHOLD = 42      # Total weight > 42 = high
MODERATE_THRESHOLD = 27  # Total weight > 27 = moderate

for _ in range(num_samples):
    # Create more realistic symptom combinations
    category = np.random.choice(list(symptom_categories.keys()))
    base_symptoms = list(np.random.choice(symptom_categories[category], 
                                          size=np.random.randint(1, 4), 
                                          replace=False))
    
    # Add some random additional symptoms (25% chance)
    if np.random.random() < 0.25:
        extra_symptoms = np.random.choice(
            [s for s in symptoms_list if s not in base_symptoms],
            size=np.random.randint(1, 3),
            replace=False
        )
        base_symptoms.extend(extra_symptoms)
    
    selected_symptoms = list(set(base_symptoms))
    
    # Create binary feature vector
    features = [1 if symptom in selected_symptoms else 0 for symptom in symptoms_list]
    X.append(features)
    
    # Calculate REAL severity score (actual weight sum)
    severity_score = sum(symptom_weights.get(s, 0) for s in selected_symptoms)
    
    # Scale to 0-10 range more realistically
    # Max possible weight from 5 symptoms with max weight 7 = 35
    # But emergency cases can have higher weights
    max_realistic = 50  # For scaling to 0-10
    if severity_score > max_realistic:
        normalized_score = 10.0  # Cap at 10 for severe cases
    else:
        normalized_score = (severity_score / max_realistic) * 10
    
    y_severity.append(normalized_score)
    
    # Determine urgency level based on actual medical thresholds
    if severity_score >= EMERGENCY_THRESHOLD or any(s in symptom_categories["emergency"] for s in selected_symptoms):
        urgency = 2  # Urgent/High
    elif severity_score >= HIGH_THRESHOLD:
        urgency = 1  # Moderate
    else:
        urgency = 0  # Low
    
    y_urgency.append(urgency)
    
    # Get recommendations based on symptom categories
    recommendations = []
    
    # Add general recommendations
    recommendations.extend([
        "Stay hydrated",
        "Consult a healthcare professional",
        "Rest adequately",
        "Monitor symptoms closely"
    ])
    
    # Add category-specific recommendations
    if "respiratory" in category:
        recommendations.extend([
            "Use a humidifier",
            "Avoid smoking and pollutants",
            "Practice deep breathing exercises",
            "Elevate head while sleeping"
        ])
    elif "gastrointestinal" in category:
        recommendations.extend([
            "Eat bland foods (BRAT diet)",
            "Avoid spicy and fatty foods",
            "Stay hydrated with electrolyte solutions",
            "Small, frequent meals"
        ])
    elif "neurological" in category:
        recommendations.extend([
            "Avoid bright lights and loud noises",
            "Practice relaxation techniques",
            "Maintain regular sleep schedule",
            "Avoid caffeine and alcohol"
        ])
    
    # Get workout recommendations based on symptom severity
    if severity_score >= EMERGENCY_THRESHOLD:
        recommendations.extend([
            "🚨 SEEK IMMEDIATE MEDICAL ATTENTION",
            "Do not delay emergency care",
            "Call emergency services if needed",
            "Have someone stay with you"
        ])
    elif severity_score >= HIGH_THRESHOLD:
        recommendations.extend([
            "Schedule urgent medical appointment",
            "Avoid strenuous activities",
            "Keep emergency contacts handy",
            "Monitor vital signs regularly"
        ])
    
    y_recommendations.append(recommendations[:10])  # Limit to 10 recommendations

X = np.array(X)
y_severity = np.array(y_severity)
y_urgency = np.array(y_urgency)

print(f"✅ Created {num_samples} realistic samples")
print(f"✅ Features shape: {X.shape}")
print(f"✅ Severity scores range: {y_severity.min():.2f} - {y_severity.max():.2f}")
print(f"✅ Urgency distribution:")
print(f"   Low: {np.sum(y_urgency == 0)} samples")
print(f"   Moderate: {np.sum(y_urgency == 1)} samples")
print(f"   High: {np.sum(y_urgency == 2)} samples")

# ==========================
# 3️⃣ Train severity prediction model
# ==========================
print("\n🤖 Training severity prediction model...")
X_train, X_test, y_sev_train, y_sev_test = train_test_split(
    X, y_severity, test_size=0.2, random_state=42
)

severity_model = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_split=3,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)
severity_model.fit(X_train, y_sev_train)

sev_train_score = severity_model.score(X_train, y_sev_train)
sev_test_score = severity_model.score(X_test, y_sev_test)
print(f"✅ Severity Model - R² Score:")
print(f"   Training: {sev_train_score:.3f}")
print(f"   Testing:  {sev_test_score:.3f}")

# ==========================
# 4️⃣ Train urgency classification model
# ==========================
print("\n🚨 Training urgency classification model...")
X_train_urg, X_test_urg, y_urg_train, y_urg_test = train_test_split(
    X, y_urgency, test_size=0.2, random_state=42, stratify=y_urgency
)

urgency_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=3,
    min_samples_leaf=2,
    random_state=42,
    class_weight='balanced',
    n_jobs=-1
)
urgency_model.fit(X_train_urg, y_urg_train)

urg_train_score = urgency_model.score(X_train_urg, y_urg_train)
urg_test_score = urgency_model.score(X_test_urg, y_urg_test)
print(f"✅ Urgency Model - Accuracy:")
print(f"   Training: {urg_train_score:.3f}")
print(f"   Testing:  {urg_test_score:.3f}")

# ==========================
# 5️⃣ Create recommendation engine
# ==========================
print("\n💡 Creating recommendation engine...")

# Map symptoms to workout categories
symptom_to_category = {}
for category, symptoms in symptom_categories.items():
    for symptom in symptoms:
        symptom_to_category[symptom] = category

# Get general workout recommendations
general_workouts = [
    "Stay hydrated by drinking plenty of water",
    "Get adequate rest and sleep",
    "Eat a balanced, nutritious diet",
    "Practice stress-reduction techniques",
    "Maintain good personal hygiene"
]

# Create urgency-specific recommendations
urgency_recommendations = {
    "low": [
        "Schedule a routine doctor appointment",
        "Practice self-care and monitoring",
        "Follow general health guidelines",
        "Consider over-the-counter remedies if appropriate"
    ],
    "moderate": [
        "Schedule appointment within 24-48 hours",
        "Monitor symptoms closely",
        "Avoid strenuous activities",
        "Keep emergency contacts accessible"
    ],
    "high": [
        "🚨 SEEK IMMEDIATE MEDICAL ATTENTION",
        "Call emergency services if severe",
        "Do not delay seeking care",
        "Have someone accompany you"
    ]
}

# ==========================
# 6️⃣ Save models and metadata
# ==========================
print("\n💾 Saving models and metadata...")

# Calculate symptom importance
feature_importance = pd.DataFrame({
    'symptom': symptoms_list,
    'importance': severity_model.feature_importances_
}).sort_values('importance', ascending=False)

# Prepare model package
model_package = {
    'severity_model': severity_model,
    'urgency_model': urgency_model,
    'symptoms': symptoms_list,
    'symptom_weights': symptom_weights,
    'symptom_categories': symptom_categories,
    'symptom_to_category': symptom_to_category,
    'disease_workouts': disease_workouts,
    'general_workouts': general_workouts,
    'urgency_recommendations': urgency_recommendations,
    'feature_importance': feature_importance.to_dict('records'),
    'emergency_threshold': EMERGENCY_THRESHOLD,
    'high_threshold': HIGH_THRESHOLD,
    'moderate_threshold': MODERATE_THRESHOLD,
    'max_realistic_score': 50,  # For scaling to 0-10
    'training_stats': {
        'num_samples': num_samples,
        'severity_range': [float(y_severity.min()), float(y_severity.max())],
        'urgency_distribution': {
            'low': int(np.sum(y_urgency == 0)),
            'moderate': int(np.sum(y_urgency == 1)),
            'high': int(np.sum(y_urgency == 2))
        }
    }
}

with open("severity_model.pkl", "wb") as f:
    pickle.dump(model_package, f)

print(f"✅ Models saved as 'severity_model.pkl'")
print(f"✅ Number of symptoms: {len(symptoms_list)}")
print(f"✅ Top 5 important symptoms:")
for i, row in feature_importance.head().iterrows():
    print(f"   {i+1}. {row['symptom']} (weight: {symptom_weights.get(row['symptom'], 0)}): {row['importance']:.4f}")

print("\n" + "=" * 60)
print("🎉 TRAINING COMPLETE!")
print("=" * 60)
print("\n📊 Model Statistics:")
print(f"   Max possible severity weight: {severity_df['weight'].sum()}")
print(f"   Emergency threshold: >{EMERGENCY_THRESHOLD} total weight")
print(f"   High threshold: >{HIGH_THRESHOLD} total weight")
print(f"   Moderate threshold: >{MODERATE_THRESHOLD} total weight")
print(f"   Scaling factor: 0-{model_package['max_realistic_score']} → 0-10")