"""
DKUT Medical Center - ML Model Trainer
Trains duration prediction model using data from PostgreSQL database
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
import json

# Database connection
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 not installed. Install with: pip install psycopg2")
    sys.exit(1)


class DurationPredictor:
    """ML model for predicting consultation duration"""
    
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.feature_names = [
            'department', 'priority', 'appointmentType',
            'symptomCount', 'timeOfDay', 'dayOfWeek'
        ]
        self.version = "v1.0-randomforest"
        
    def connect_db(self):
        """Connect to PostgreSQL database"""
        # Get connection string from environment or use default
        db_url = os.getenv('DATABASE_URL', 
                          'postgresql://postgres:root2025@localhost:5432/dkut_medical')
        
        try:
            conn = psycopg2.connect(db_url)
            print("✅ Connected to database")
            return conn
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            sys.exit(1)
    
    def fetch_training_data(self, conn, limit=None):
        """
        Fetch training data from Interaction and Appointment models
        
        Returns training data with features and target (actualDuration)
        """
        print("\n📊 Fetching training data from database...")
        
        query = """
        SELECT 
            i.id,
            i.department,
            i.priority,
            i."appointmentType",
            i."symptomCount",
            i."checkInTime",
            i."totalDuration" as actual_duration,
            i."predictedDuration" as predicted_duration,
            a.id as appointment_id,
            a."appointmentDate",
            a."appointmentTime"
        FROM 
            "Interaction" i
        INNER JOIN 
            "Appointment" a ON i."appointmentId" = a.id
        WHERE 
            i."totalDuration" IS NOT NULL
            AND i."predictedDuration" IS NOT NULL
            AND i."totalDuration" > 0
        ORDER BY 
            i."checkInTime" DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        
        print(f"  Found {len(rows)} completed interactions")
        
        if len(rows) == 0:
            print("  ⚠️  No training data available")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(rows)
        
        # Debug: Print column names to verify
        print(f"  Columns found: {df.columns.tolist()}")
        
        # Extract time features - use correct column name
        df['checkInTime'] = pd.to_datetime(df['checkInTime'])
        df['timeOfDay'] = df['checkInTime'].dt.hour
        df['dayOfWeek'] = df['checkInTime'].dt.dayofweek
        
        print(f"  ✅ Loaded {len(df)} training samples")
        return df
    
    def prepare_features(self, df, fit=True):
        """
        Prepare features for training/prediction
        
        Args:
            df: DataFrame with raw features
            fit: If True, fit encoders. If False, use existing encoders
        
        Returns:
            X: Feature matrix
            y: Target vector (if actualDuration present)
        """
        # Debug: Print available columns
        print(f"  Available columns: {df.columns.tolist()}")
        
        # The column names from SQL will preserve case for quoted columns
        # Create lowercase versions for consistency
        if 'appointmentType' in df.columns:
            df['appointmenttype'] = df['appointmentType']
        if 'symptomCount' in df.columns:
            df['symptomcount'] = df['symptomCount']
        if 'timeOfDay' in df.columns:
            df['timeofday'] = df['timeOfDay']
        if 'dayOfWeek' in df.columns:
            df['dayofweek'] = df['dayOfWeek']
        
        # Encode categorical features - use lowercase column names
        categorical_cols = ['department', 'priority', 'appointmenttype']
        
        df_encoded = df.copy()
        
        for col in categorical_cols:
            if fit:
                # Fit new encoder
                self.encoders[col] = LabelEncoder()
                df_encoded[col + '_encoded'] = self.encoders[col].fit_transform(df[col])
            else:
                # Use existing encoder
                if col not in self.encoders:
                    raise ValueError(f"Encoder for {col} not found. Train model first.")
                df_encoded[col + '_encoded'] = self.encoders[col].transform(df[col])
        
        # Select features - use lowercase column names
        feature_cols = [
            'department_encoded',
            'priority_encoded',
            'appointmenttype_encoded',
            'symptomcount',
            'timeofday',
            'dayofweek'
        ]
        
        # Debug: Check if all required columns exist
        missing_cols = [col for col in feature_cols if col not in df_encoded.columns]
        if missing_cols:
            print(f"  ⚠️  Missing columns: {missing_cols}")
            print(f"  Available columns: {df_encoded.columns.tolist()}")
            raise KeyError(f"Missing columns: {missing_cols}")
        
        X = df_encoded[feature_cols].values
        
        # Target variable - use lowercase column name
        y = df['actual_duration'].values if 'actual_duration' in df.columns else None
        
        print(f"  Features shape: {X.shape}")
        print(f"  Target shape: {y.shape if y is not None else 'None'}")
        
        return X, y
    
    def train(self, X_train, y_train, X_test, y_test):
        """Train Random Forest model"""
        print("\n🤖 Training Random Forest model...")
        
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        # Train
        self.model.fit(X_train, y_train)
        
        # Evaluate on test set
        y_pred = self.model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        print(f"\n📈 Model Performance:")
        print(f"  MAE:  {mae:.2f} minutes")
        print(f"  RMSE: {rmse:.2f} minutes")
        print(f"  R²:   {r2:.3f}")
        
        # Feature importance
        print(f"\n🔍 Feature Importance:")
        importances = self.model.feature_importances_
        for i, importance in enumerate(importances):
            feature_name = self.feature_names[i]
            print(f"  {feature_name}: {importance:.3f}")
        
        return {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'feature_importances': dict(zip(self.feature_names, importances.tolist()))
        }
    
    def predict(self, features):
        """
        Predict duration for new appointment
        
        Args:
            features: dict with keys: department, priority, appointmentType,
                     symptomCount, timeOfDay, dayOfWeek
        
        Returns:
            dict with predictedDuration, confidence, modelVersion
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Convert features to DataFrame
        df = pd.DataFrame([features])
        
        # Create lowercase versions for consistency
        df['appointmenttype'] = df['appointmentType']
        df['symptomcount'] = df['symptomCount']
        df['timeofday'] = df['timeOfDay']
        df['dayofweek'] = df['dayOfWeek']
        
        # Prepare features (use existing encoders)
        X, _ = self.prepare_features(df, fit=False)
        
        # Predict
        predicted = self.model.predict(X)[0]
        
        # Calculate confidence (inverse of prediction variance across trees)
        predictions = np.array([tree.predict(X)[0] for tree in self.model.estimators_])
        std = np.std(predictions)
        confidence = 1.0 / (1.0 + std / max(predicted, 1))
        
        return {
            'predictedDuration': int(max(5, min(predicted, 120))),  # Clamp 5-120 min
            'confidence': round(float(confidence), 2),
            'modelVersion': self.version
        }
    
    def save_model(self, filepath='models/duration_predictor.pkl'):
        """Save trained model and encoders"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        model_data = {
            'model': self.model,
            'encoders': self.encoders,
            'feature_names': self.feature_names,
            'version': self.version
        }
        
        joblib.dump(model_data, filepath)
        print(f"\n💾 Model saved to: {filepath}")
    
    @classmethod
    def load_model(cls, filepath='models/duration_predictor.pkl'):
        """Load trained model"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        
        predictor = cls()
        predictor.model = model_data['model']
        predictor.encoders = model_data['encoders']
        predictor.feature_names = model_data['feature_names']
        predictor.version = model_data['version']
        
        print(f"✅ Model loaded: {predictor.version}")
        return predictor


def train_model_from_db(min_samples=50, test_size=0.2):
    """
    Main training function
    
    Args:
        min_samples: Minimum number of samples required for training
        test_size: Fraction of data to use for testing
    """
    print("="*60)
    print("🏥 DKUT Medical Center - ML Model Training")
    print("="*60)
    
    # Initialize predictor
    predictor = DurationPredictor()
    
    # Connect to database
    conn = predictor.connect_db()
    
    # Fetch training data
    df = predictor.fetch_training_data(conn)
    
    if df is None or len(df) < min_samples:
        print(f"\n❌ Need at least {min_samples} samples to train")
        print(f"   Currently have: {len(df) if df is not None else 0} samples")
        print(f"\n💡 Run the system to collect more interaction data")
        conn.close()
        return None
    
    # Prepare features
    print(f"\n🔧 Preparing features...")
    X, y = predictor.prepare_features(df, fit=True)
    
    print(f"  Features shape: {X.shape}")
    print(f"  Target shape: {y.shape}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42
    )
    
    print(f"\n📊 Data Split:")
    print(f"  Training samples: {len(X_train)}")
    print(f"  Test samples: {len(X_test)}")
    
    # Train model
    metrics = predictor.train(X_train, y_train, X_test, y_test)
    
    # Save model
    predictor.save_model()
    
    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'samples': len(df),
        'train_samples': len(X_train),
        'test_samples': len(X_test),
        'metrics': metrics,
        'version': predictor.version
    }
    
    os.makedirs('models', exist_ok=True)
    with open('models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n📄 Metadata saved to: models/metadata.json")
    
    # Close connection
    conn.close()
    
    print("\n" + "="*60)
    print("✅ Training completed successfully!")
    print("="*60)
    
    return predictor


if __name__ == '__main__':
    # Run training
    predictor = train_model_from_db(min_samples=50)
    
    if predictor:
        # Test prediction
        print("\n🧪 Testing prediction...")
        
        test_features = {
            'department': 'GENERAL_MEDICINE',
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 3,
            'timeOfDay': 10,
            'dayOfWeek': 2
        }
        
        prediction = predictor.predict(test_features)
        print(f"\n📊 Test Prediction:")
        print(f"  Input: {test_features}")
        print(f"  Predicted Duration: {prediction['predictedDuration']} minutes")
        print(f"  Confidence: {prediction['confidence']}")
        print(f"  Model Version: {prediction['modelVersion']}")