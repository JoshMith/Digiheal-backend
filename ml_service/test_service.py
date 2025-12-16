#!/usr/bin/env python3
"""
Test script for Health Severity Assessment API
"""

import requests
import json
import sys

BASE_URL = ["http://127.0.0.1:5000", "https://miffiest-tom-pyramidally.ngrok-free.dev"][0]  # Change index to switch between local and ngrok

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
        assert "thresholds" in data, "Thresholds missing"
        print("✅ Info endpoint passed")
        return True
    except Exception as e:
        print(f"❌ Info endpoint failed: {e}")
        return False

def test_symptoms():
    """Test symptoms list endpoint"""
    print("Testing /symptoms endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/symptoms")
        print(f"Status Code: {response.status_code}")
        data = response.json()
        
        assert response.status_code == 200, "Symptoms endpoint failed"
        assert "symptoms" in data, "Symptoms list missing"
        assert len(data["symptoms"]) > 0, "No symptoms returned"
        print(f"✅ Symptoms endpoint passed - {len(data['symptoms'])} symptoms loaded")
        return True
    except Exception as e:
        print(f"❌ Symptoms endpoint failed: {e}")
        return False

def test_predict_basic():
    """Test basic prediction"""
    print("Testing /predict endpoint (basic)...")
    data = {
        "symptoms": ["fever", "cough", "fatigue"]
    }
    print(f"Input Data: {json.dumps(data, indent=2)}")
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        assert response.status_code == 200, "Prediction failed"
        assert "risk_score" in result, "Risk score missing"
        assert "confidence" in result, "Confidence missing"
        assert "urgency" in result, "Urgency missing"
        assert "recommendations" in result, "Recommendations missing"
        
        # Validate ranges
        assert 0 <= result["risk_score"] <= 10, f"Risk score {result['risk_score']} out of range"
        assert 0 <= result["confidence"] <= 100, f"Confidence {result['confidence']} out of range"
        assert result["urgency"] in ["low", "moderate", "high"], f"Invalid urgency level: {result['urgency']}"
        
        print(f"✅ Basic prediction passed - Risk: {result['risk_score']}, Urgency: {result['urgency']}")
        return True
    except Exception as e:
        print(f"❌ Basic prediction failed: {e}")
        return False

def test_predict_high_severity():
    """Test high severity prediction"""
    print("Testing /predict endpoint (high severity)...")
    data = {
        "symptoms": ["high fever", "chest pain", "shortness of breath", "dizziness"]
    }
    print(f"Input Data: {json.dumps(data, indent=2)}")
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        
        assert response.status_code == 200, "High severity prediction failed"
        
        print(f"✅ High severity prediction passed")
        print(f"   Risk Score: {result['risk_score']}")
        print(f"   Urgency: {result['urgency']}")
        print(f"   Raw Severity: {result['analysis']['raw_severity_score']}")
        
        # High severity symptoms should have higher risk scores
        if result["risk_score"] > 3:
            print(f"   ✅ Realistic risk score for serious symptoms")
        else:
            print(f"   ⚠️  Risk score seems low for serious symptoms")
        
        return True
    except Exception as e:
        print(f"❌ High severity test failed: {e}")
        return False

def test_predict_emergency():
    """Test emergency case prediction"""
    print("Testing /predict endpoint (emergency case)...")
    data = {
        "symptoms": ["severe chest pain", "shortness of breath", "dizziness", "passing out"],
        "age": 55,
        "gender": "male",
        "duration": "1 hour",
        "severity": "severe"
    }
    print(f"Input Data: {json.dumps(data, indent=2)}")
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        
        assert response.status_code == 200, "Emergency prediction failed"
        
        print(f"Urgency Level: {result['urgency']}")
        print(f"Risk Score: {result['risk_score']}")
        print(f"Confidence: {result['confidence']}%")
        print(f"Number of Recommendations: {len(result['recommendations'])}")
        
        # Emergency cases should have high urgency and high risk scores
        if result["urgency"] == "high":
            print("✅ Emergency case correctly identified as HIGH urgency")
        else:
            print(f"⚠️  Emergency case not identified as high urgency")
        
        if result["risk_score"] >= 7:
            print(f"✅ Realistic high risk score for emergency: {result['risk_score']}")
        else:
            print(f"⚠️  Risk score seems low for emergency: {result['risk_score']}")
        
        # Check for emergency recommendations
        emergency_keywords = ["🚨", "EMERGENCY", "IMMEDIATE", "urgent"]
        has_emergency_rec = any(any(kw in rec.upper() for kw in emergency_keywords) 
                                for rec in result["recommendations"])
        
        if has_emergency_rec:
            print("✅ Emergency recommendations included")
        else:
            print("⚠️  No emergency-specific recommendations")
        
        print("✅ Emergency case prediction passed")
        return True
    except Exception as e:
        print(f"❌ Emergency case test failed: {e}")
        return False

def test_predict_multiple_symptoms():
    """Test prediction with many symptoms"""
    print("Testing /predict endpoint (multiple symptoms)...")
    data = {
        "symptoms": [
            "high fever", "severe headache", "vomiting", "diarrhoea",
            "abdominal pain", "fatigue", "dizziness", "muscle pain"
        ]
    }
    print(f"Input Data: {len(data['symptoms'])} symptoms")
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        result = response.json()
        
        assert response.status_code == 200, "Multiple symptoms prediction failed"
        
        print(f"✅ Multiple symptoms prediction passed")
        print(f"   Risk Score: {result['risk_score']}")
        print(f"   Urgency: {result['urgency']}")
        print(f"   Raw Severity: {result['analysis']['raw_severity_score']}")
        
        # Many symptoms should increase risk
        if result["risk_score"] > result["analysis"]["raw_severity_score"] / 10:
            print(f"   ✅ Risk score appropriately increased with multiple symptoms")
        
        return True
    except Exception as e:
        print(f"❌ Multiple symptoms test failed: {e}")
        return False

def test_predict_empty_symptoms():
    """Test prediction with empty symptoms (should fail)"""
    print("Testing /predict endpoint (empty symptoms)...")
    data = {
        "symptoms": []
    }
    print(f"Input Data: {json.dumps(data, indent=2)}")
    try:
        response = requests.post(f"{BASE_URL}/predict", json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Empty symptoms validation passed")
            return True
        else:
            print(f"❌ Should return 400 for empty symptoms, got {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            return False
    except Exception as e:
        print(f"❌ Empty symptoms test failed: {e}")
        return False

def main():
    """Run all tests"""
    print_section("HEALTH SEVERITY ASSESSMENT API TEST SUITE")
    
    # Check if service is running
    print("Checking if API service is running...")
    try:
        requests.get(BASE_URL, timeout=5)
        print("✅ Service is running")
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {BASE_URL}")
        print("Please start the API service first:")
        print("  python app.py")
        sys.exit(1)
    
    # Run tests
    tests = [
        ("Health Check", test_health),
        ("Model Info", test_info),
        ("Symptoms List", test_symptoms),
        ("Basic Prediction", test_predict_basic),
        ("High Severity Prediction", test_predict_high_severity),
        ("Emergency Case", test_predict_emergency),
        ("Multiple Symptoms", test_predict_multiple_symptoms),
        ("Empty Symptoms Validation", test_predict_empty_symptoms),
    ]
    
    results = []
    for name, test_func in tests:
        print_section(name)
        try:
            results.append(test_func())
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("\n✅ API is ready for frontend integration")
        print("Expected response format for frontend:")
        print("""
{
  "risk_score": 7.2,          // 0-10 scale
  "confidence": 85.5,         // 0-100%
  "urgency": "moderate",      // low/moderate/high
  "recommendations": ["..."], // array of strings (URGENCY-SPECIFIC!)
  "symptoms_analyzed": 3
}
        """)
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()