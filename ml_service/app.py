from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # ✅ Allow all origins

# =========================================
# 1️⃣ Load model and datasets
# =========================================
data = pickle.load(open("model.pkl", "rb"))
model = data["model"]
trained_features = data["features"]  # 🧠 List of features model was trained with

symptom_severity = pd.read_csv("Symptom-severity.csv")

# ✅ Load and clean workout dataset
workouts = pd.read_csv("workout_df.csv")
workouts = workouts.loc[:, ~workouts.columns.str.contains("^Unnamed")]  # Drop redundant cols
workouts.columns = workouts.columns.str.strip().str.lower().str.replace(" ", "_")

# =========================================
# 2️⃣ Clean and standardize symptom names
# =========================================
symptom_severity["Symptom"] = (
    symptom_severity["Symptom"]
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
    .str.replace(".", "", regex=False)
)
weights = dict(zip(symptom_severity["Symptom"], symptom_severity["weight"]))

# =========================================
# 3️⃣ API Routes
# =========================================
@app.route("/")
def home():
    return "✅ Flask Medical Assistant API is running"

# =========================================
# 4️⃣ Prediction Route
# =========================================
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data or "symptoms" not in data:
            return jsonify({"error": "No symptoms provided"}), 400

        # Clean input symptoms
        symptoms = [
            s.strip().lower().replace(" ", "_").replace(".", "")
            for s in data["symptoms"]
        ]

        # Create binary input vector aligned with trained features
        input_vector = [1 if s in symptoms else 0 for s in trained_features]
        input_df = pd.DataFrame([input_vector], columns=trained_features)

        # ✅ Predict the disease
        disease = model.predict(input_df)[0]

        # Calculate severity
        severity_score = sum(weights.get(s, 0) for s in symptoms if s in weights)
        if severity_score <= 27:
            urgency = "Low"
        elif severity_score <= 42:
            urgency = "Moderate"
        else:
            urgency = "Urgent"

        # ✅ Suggest workouts based on disease
        workout_suggestions = workouts[
            workouts["disease"].str.lower() == disease.lower()
        ]["workout"].tolist()

        return jsonify({
            "disease": disease,
            "severity_score": severity_score,
            "urgency": urgency,
            "workouts": workout_suggestions
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =========================================
# 5️⃣ Run Server
# =========================================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
