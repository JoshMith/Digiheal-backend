#!/usr/bin/env python3
"""
Test script for DKUT ML Service
Tests all endpoints and verifies responses
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def print_section(title):
    """Print formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_health():
    """Test health check endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, "Health check failed"
        assert response.json()["status"] == "healthy", "Service not healthy"
        print("✅ Health check passed")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_info():
    """Test model info endpoint"""
    print("Testing /info endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/info")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, "Info endpoint failed"
        data = response.json()
        assert "model_type" in data, "Model type missing"
        assert "version" in data, "Version missing"
        print("✅ Info endpoint passed")
        return True
    except Exception as e:
        print(f"❌ Info endpoint failed: {e}")
        return False

def test_predict_basic():
    """Test basic prediction"""
    print("Testing /predict endpoint (basic)...")
    data = {
        "symptoms": ["fever", "cough", "fatigue"]
    }
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, "Prediction failed"
        result = response.json()
        assert "disease" in result, "Disease prediction missing"
        assert "urgency" in result, "Urgency missing"
        assert "severity_score" in result, "Severity score missing"
        assert "recommendations" in result, "Recommendations missing"
        print("✅ Basic prediction passed")
        return True
    except Exception as e:
        print(f"❌ Basic prediction failed: {e}")
        return False

def test_predict_full():
    """Test prediction with full details"""
    print("Testing /predict endpoint (full details)...")
    data = {
        "symptoms": ["fever", "headache", "body aches", "fatigue"],
        "age": 25,
        "gender": "male",
        "duration": "3 days",
        "severity": "moderate"
    }
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, "Full prediction failed"
        result = response.json()
        assert "disease" in result, "Disease prediction missing"
        assert "urgency" in result, "Urgency missing"
        assert result["urgency"] in ["LOW", "MODERATE", "URGENT"], "Invalid urgency level"
        print("✅ Full prediction passed")
        return True
    except Exception as e:
        print(f"❌ Full prediction failed: {e}")
        return False

def test_predict_empty_symptoms():
    """Test prediction with empty symptoms (should fail)"""
    print("Testing /predict endpoint (empty symptoms)...")
    data = {
        "symptoms": []
    }
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 400, "Should return 400 for empty symptoms"
        print("✅ Empty symptoms validation passed")
        return True
    except Exception as e:
        print(f"❌ Empty symptoms test failed: {e}")
        return False

def test_predict_urgent_case():
    """Test urgent case prediction"""
    print("Testing /predict endpoint (urgent case)...")
    data = {
        "symptoms": ["severe chest pain", "shortness of breath", "dizziness"],
        "age": 55,
        "gender": "male",
        "duration": "1 hour",
        "severity": "severe"
    }
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        assert response.status_code == 200, "Urgent prediction failed"
        result = response.json()
        print(f"Urgency Level: {result['urgency']}")
        print("✅ Urgent case prediction passed")
        return True
    except Exception as e:
        print(f"❌ Urgent case test failed: {e}")
        return False

def main():
    """Run all tests"""
    print_section("DKUT ML Service Test Suite")
    
    # Check if service is running
    print("Checking if ML service is running...")
    try:
        requests.get(BASE_URL, timeout=2)
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {BASE_URL}")
        print("Please start the ML service first:")
        print("  cd ml_service")
        print("  source venv/bin/activate")
        print("  python app.py")
        sys.exit(1)
    
    # Run tests
    tests = [
        ("Health Check", test_health),
        ("Model Info", test_info),
        ("Basic Prediction", test_predict_basic),
        ("Full Details Prediction", test_predict_full),
        ("Empty Symptoms Validation", test_predict_empty_symptoms),
        ("Urgent Case Prediction", test_predict_urgent_case),
    ]
    
    results = []
    for name, test_func in tests:
        print_section(name)
        results.append(test_func())
    
    # Summary
    print_section("Test Summary")
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()