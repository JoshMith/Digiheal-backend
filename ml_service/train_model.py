import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import pickle

# ==========================
# 1️⃣ Load datasets
# ==========================
train = pd.read_csv("Training.csv")
severity = pd.read_csv("Symptom-severity.csv")

# ==========================
# 2️⃣ Clean and standardize feature names
# ==========================
# Clean training dataset column names
train.columns = (
    train.columns.str.strip()
    .str.lower()
    .str.replace(" ", "_")
    .str.replace(".", "", regex=False)
)

# Also clean the severity symptom names for consistency
severity["Symptom"] = (
    severity["Symptom"]
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
    .str.replace(".", "", regex=False)
)

# ==========================
# 3️⃣ Prepare features and labels
# ==========================
if "prognosis" not in train.columns:
    raise KeyError("❌ 'prognosis' column not found in Training.csv after cleaning.")

X = train.drop("prognosis", axis=1)
y = train["prognosis"]

# ==========================
# 4️⃣ Train-test split
# ==========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ==========================
# 5️⃣ Train model
# ==========================
model = RandomForestClassifier(n_estimators=150, random_state=42)
model.fit(X_train, y_train)

# ==========================
# 6️⃣ Evaluate and report
# ==========================
accuracy = model.score(X_test, y_test)
print(f"✅ Model trained successfully! Accuracy: {accuracy:.2f}")

# ==========================
# 7️⃣ Save model and feature names
# ==========================
model_package = {
    "model": model,
    "features": X.columns.tolist()
}

with open("model.pkl", "wb") as f:
    pickle.dump(model_package, f)

print(f"Model and feature names saved as model.pkl")
print(f"Number of features: {len(X.columns)}")
print(f"First 10 features: {X.columns[:10].tolist()}")
