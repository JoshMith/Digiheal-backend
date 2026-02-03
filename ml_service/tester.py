"""
DKUT Medical Center - ML Service Test Suite
Tests both heuristic model and trained ML model
"""

import unittest
import sys
import os
import json
import tempfile
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from trainer import DurationPredictor
    import pandas as pd
    import numpy as np
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Install dependencies: pip install scikit-learn pandas numpy psycopg2")
    sys.exit(1)


class TestHeuristicModel(unittest.TestCase):
    """Test the heuristic prediction model"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.heuristic_model = HeuristicModel()
    
    def test_basic_prediction(self):
        """Test basic prediction with normal parameters"""
        features = {
            'department': 'GENERAL_MEDICINE',
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 3,
            'timeOfDay': 10
        }
        
        result = self.heuristic_model.predict(features)
        
        self.assertIn('predictedDuration', result)
        self.assertIn('confidence', result)
        self.assertIn('modelVersion', result)
        
        # Check predicted duration is reasonable
        self.assertGreater(result['predictedDuration'], 5)
        self.assertLess(result['predictedDuration'], 120)
        
        # Check confidence
        self.assertEqual(result['confidence'], 0.65)
    
    def test_emergency_prediction(self):
        """Test emergency case prediction"""
        features = {
            'department': 'EMERGENCY',
            'priority': 'URGENT',
            'appointmentType': 'EMERGENCY',
            'symptomCount': 5,
            'timeOfDay': 14
        }
        
        result = self.heuristic_model.predict(features)
        
        # Emergency + Urgent should predict longer duration
        self.assertGreater(result['predictedDuration'], 30)
    
    def test_mental_health_prediction(self):
        """Test mental health consultation prediction"""
        features = {
            'department': 'MENTAL_HEALTH',
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 2,
            'timeOfDay': 9
        }
        
        result = self.heuristic_model.predict(features)
        
        # Mental health has higher base time (45 min)
        self.assertGreater(result['predictedDuration'], 35)
    
    def test_morning_efficiency(self):
        """Test morning time adjustment"""
        features_morning = {
            'department': 'GENERAL_MEDICINE',
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 2,
            'timeOfDay': 9  # Morning
        }
        
        features_afternoon = {
            **features_morning,
            'timeOfDay': 15  # Afternoon
        }
        
        result_morning = self.heuristic_model.predict(features_morning)
        result_afternoon = self.heuristic_model.predict(features_afternoon)
        
        # Morning should be faster (0.9 multiplier)
        self.assertLess(result_morning['predictedDuration'], 
                       result_afternoon['predictedDuration'])
    
    def test_symptom_count_impact(self):
        """Test that more symptoms increase duration"""
        features_low = {
            'department': 'GENERAL_MEDICINE',
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 1,
            'timeOfDay': 10
        }
        
        features_high = {
            **features_low,
            'symptomCount': 5
        }
        
        result_low = self.heuristic_model.predict(features_low)
        result_high = self.heuristic_model.predict(features_high)
        
        # More symptoms should take longer
        self.assertGreater(result_high['predictedDuration'],
                          result_low['predictedDuration'])
    
    def test_priority_multiplier(self):
        """Test priority level impact"""
        base_features = {
            'department': 'GENERAL_MEDICINE',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 2,
            'timeOfDay': 10
        }
        
        priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
        durations = []
        
        for priority in priorities:
            features = {**base_features, 'priority': priority}
            result = self.heuristic_model.predict(features)
            durations.append(result['predictedDuration'])
        
        # Durations should increase with priority
        self.assertEqual(durations, sorted(durations))
    
    def test_missing_optional_fields(self):
        """Test prediction with missing optional fields"""
        features = {
            'department': 'GENERAL_MEDICINE',
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED'
            # symptomCount and timeOfDay missing (should use defaults)
        }
        
        result = self.heuristic_model.predict(features)
        
        self.assertIn('predictedDuration', result)
        self.assertGreater(result['predictedDuration'], 0)
    
    def test_clamping(self):
        """Test that predictions are clamped to reasonable bounds"""
        features = {
            'department': 'MENTAL_HEALTH',
            'priority': 'URGENT',
            'appointmentType': 'EMERGENCY',
            'symptomCount': 10,  # Extreme
            'timeOfDay': 13  # Lunch slowdown
        }
        
        result = self.heuristic_model.predict(features)
        
        # Should be clamped to max 120 minutes
        self.assertLessEqual(result['predictedDuration'], 120)
        self.assertGreaterEqual(result['predictedDuration'], 5)


class TestMLModel(unittest.TestCase):
    """Test the ML-based prediction model"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test model with synthetic data"""
        print("\n🧪 Setting up ML model tests...")
        
        # Create synthetic training data
        cls.synthetic_data = cls.create_synthetic_data(100)
        cls.predictor = DurationPredictor()
        
        # Train on synthetic data
        X, y = cls.predictor.prepare_features(cls.synthetic_data, fit=True)
        
        # Simple train (no split for testing)
        from sklearn.ensemble import RandomForestRegressor
        cls.predictor.model = RandomForestRegressor(
            n_estimators=10,  # Small for testing
            max_depth=5,
            random_state=42
        )
        cls.predictor.model.fit(X, y)
        
        print("✅ Test model trained")
    
    @staticmethod
    def create_synthetic_data(n_samples=100):
        """Create synthetic training data with ALL possible categories"""
        np.random.seed(42)
        
        # Include ALL possible departments from your Prisma schema
        departments = ['GENERAL_MEDICINE', 'EMERGENCY', 'PEDIATRICS', 
                      'MENTAL_HEALTH', 'DENTAL', 'PHARMACY', 'LABORATORY']
        priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
        types = ['WALK_IN', 'SCHEDULED', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP']
        
        data = []
        for _ in range(n_samples):
            dept = np.random.choice(departments)
            priority = np.random.choice(priorities)
            apt_type = np.random.choice(types)
            symptoms = np.random.randint(1, 6)
            hour = np.random.randint(8, 18)
            day = np.random.randint(0, 7)
            
            # Calculate synthetic duration (with noise)
            base_times = {
                'GENERAL_MEDICINE': 15,
                'EMERGENCY': 25,
                'PEDIATRICS': 20,
                'MENTAL_HEALTH': 45,
                'DENTAL': 30,
                'PHARMACY': 10,
                'LABORATORY': 15
            }
            priority_mult = {
                'LOW': 0.8,
                'NORMAL': 1.0,
                'HIGH': 1.5,
                'URGENT': 2.0
            }
            
            base = base_times.get(dept, 15)
            mult = priority_mult[priority]
            duration = int(base * mult + symptoms * 2.5 + np.random.normal(0, 5))
            duration = max(5, min(duration, 120))
            
            data.append({
                'department': dept,
                'priority': priority,
                'appointmenttype': apt_type,
                'symptomcount': symptoms,
                'timeofday': hour,
                'dayofweek': day,
                'actual_duration': duration
            })
        
        return pd.DataFrame(data)
    
    def test_ml_prediction(self):
        """Test ML model prediction - use known categories"""
        # Use a department that definitely exists in synthetic data
        features = {
            'department': 'GENERAL_MEDICINE',  # Always in synthetic data
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 3,
            'timeOfDay': 10,
            'dayOfWeek': 2
        }
        
        result = self.predictor.predict(features)
        
        self.assertIn('predictedDuration', result)
        self.assertIn('confidence', result)
        self.assertIn('modelVersion', result)
        
        # Check bounds
        self.assertGreaterEqual(result['predictedDuration'], 5)
        self.assertLessEqual(result['predictedDuration'], 120)
        
        # Check confidence is between 0 and 1
        self.assertGreaterEqual(result['confidence'], 0)
        self.assertLessEqual(result['confidence'], 1)
    
    def test_model_save_load(self):
        """Test model persistence - use known categories"""
        # Save model to temp file
        with tempfile.NamedTemporaryFile(suffix='.pkl', delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            self.predictor.save_model(tmp_path)
            self.assertTrue(os.path.exists(tmp_path))
            
            # Load model
            loaded_predictor = DurationPredictor.load_model(tmp_path)
            
            # Test prediction with loaded model
            # Use categories that definitely exist in synthetic training data
            features = {
                'department': 'GENERAL_MEDICINE',  # Definitely in training
                'priority': 'HIGH',
                'appointmentType': 'SCHEDULED',    # Definitely in training
                'symptomCount': 4,
                'timeOfDay': 14,
                'dayOfWeek': 3
            }
            
            result = loaded_predictor.predict(features)
            self.assertIn('predictedDuration', result)
            
        finally:
            # Cleanup
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    def test_feature_encoding(self):
        """Test that categorical features are properly encoded"""
        df = self.create_synthetic_data(10)
        
        X, y = self.predictor.prepare_features(df, fit=False)
        
        # X should be numeric
        self.assertTrue(np.issubdtype(X.dtype, np.number), 
                       f"Expected numeric dtype, got {X.dtype}")
        
        # Should have 6 features
        self.assertEqual(X.shape[1], 6)
    
    def test_consistency(self):
        """Test that same input gives same output"""
        features = {
            'department': 'PEDIATRICS',  # Definitely in synthetic data
            'priority': 'NORMAL',
            'appointmentType': 'SCHEDULED',
            'symptomCount': 2,
            'timeOfDay': 11,
            'dayOfWeek': 1
        }
        
        result1 = self.predictor.predict(features)
        result2 = self.predictor.predict(features)
        
        self.assertEqual(result1['predictedDuration'], 
                        result2['predictedDuration'])


class TestDatabaseIntegration(unittest.TestCase):
    """Test database integration (requires running database)"""
    
    def setUp(self):
        """Check if database is available"""
        try:
            import psycopg2
            self.db_available = True
            
            # Try to connect
            predictor = DurationPredictor()
            try:
                conn = predictor.connect_db()
                conn.close()
            except:
                self.db_available = False
                
        except ImportError:
            self.db_available = False
    
    def test_fetch_training_data(self):
        """Test fetching data from database"""
        if not self.db_available:
            self.skipTest("Database not available")
        
        predictor = DurationPredictor()
        conn = predictor.connect_db()
        
        try:
            df = predictor.fetch_training_data(conn, limit=10)
            
            if df is not None:
                # Check columns - use the actual column names from trainer.py
                required_cols = ['department', 'priority', 'appointmentType',
                               'symptomCount', 'actual_duration', 'timeOfDay', 'dayOfWeek']
                for col in required_cols:
                    self.assertIn(col, df.columns)
                
                # Check data types
                self.assertTrue(df['symptomCount'].dtype in [np.int32, np.int64])
                self.assertTrue(df['actual_duration'].dtype in [np.int32, np.int64])
        
        finally:
            conn.close()


# Helper class for heuristic model testing
class HeuristicModel:
    """Simplified heuristic model for testing"""
    
    def __init__(self):
        self.version = "v0.1-heuristic"
        
    def predict(self, features):
        dept = features.get('department', 'GENERAL_MEDICINE')
        priority = features.get('priority', 'NORMAL')
        symptoms = features.get('symptomCount', 1)
        hour = features.get('timeOfDay', 12)
        
        base_times = {
            'GENERAL_MEDICINE': 15,
            'EMERGENCY': 25,
            'PEDIATRICS': 20,
            'MENTAL_HEALTH': 45,
            'DENTAL': 30
        }
        
        priority_mult = {
            'LOW': 0.8,
            'NORMAL': 1.0,
            'HIGH': 1.5,
            'URGENT': 2.0
        }
        
        base = base_times.get(dept, 15)
        mult = priority_mult.get(priority, 1.0)
        symptom_time = symptoms * 2.5
        
        if 8 <= hour <= 11:
            time_mult = 0.9
        elif 12 <= hour <= 14:
            time_mult = 1.1
        else:
            time_mult = 1.0
        
        predicted = int(base * mult * time_mult + symptom_time)
        predicted = max(5, min(predicted, 120))
        
        return {
            'predictedDuration': predicted,
            'confidence': 0.65,
            'modelVersion': self.version
        }


def run_tests():
    """Run all tests"""
    print("="*60)
    print("🧪 DKUT Medical Center - ML Service Test Suite")
    print("="*60)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestHeuristicModel))
    suite.addTests(loader.loadTestsFromTestCase(TestMLModel))
    suite.addTests(loader.loadTestsFromTestCase(TestDatabaseIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    
    if result.wasSuccessful():
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)