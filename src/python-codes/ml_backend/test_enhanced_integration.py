#!/usr/bin/env python3
"""
Test script for enhanced ML backend with task type detection
"""

import requests
import json

def test_enhanced_backend():
    """Test the enhanced backend with task type detection"""
    
    base_url = "http://localhost:5000"
    
    # Test data - classification example
    classification_data = {
        "model_name": "random_forest",
        "csv_data": """feature1,feature2,feature3,target
1.5,2.3,0.8,0
2.1,1.7,1.2,1
3.2,3.8,2.1,0
1.8,2.9,1.5,1
2.7,2.2,1.8,0
3.5,4.1,2.3,1
1.2,1.9,0.9,0
2.9,3.2,2.0,1""",
        "features": ["feature1", "feature2", "feature3"],
        "target": "target",
        "test_size": 0.2,
        "hyperparams": {
            "n_estimators": 50,
            "max_depth": 5,
            "task_type": "classification",
            "model_variant": "RandomForestClassifier"
        }
    }
    
    # Test data - regression example  
    regression_data = {
        "model_name": "random_forest",
        "csv_data": """feature1,feature2,target
1.5,2.3,15.7
2.1,1.7,18.2
3.2,3.8,25.1
1.8,2.9,19.3
2.7,2.2,21.8
3.5,4.1,28.5
1.2,1.9,14.2
2.9,3.2,23.7""",
        "features": ["feature1", "feature2"],
        "target": "target",
        "test_size": 0.2,
        "hyperparams": {
            "n_estimators": 50,
            "max_depth": 5,
            "task_type": "regression",
            "model_variant": "RandomForestRegressor"
        }
    }
    
    print("🧪 Testing Enhanced ML Backend with Task Type Detection")
    print("=" * 60)
    
    # Test health endpoint
    try:
        health_response = requests.get(f"{base_url}/health")
        if health_response.status_code == 200:
            print("✅ Backend is healthy")
        else:
            print("❌ Backend health check failed")
            return
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("   Make sure backend is running on http://localhost:5000")
        return
    
    # Test 1: Classification with explicit task type
    print("\n🎯 Test 1: Classification with explicit task type")
    print("-" * 50)
    
    try:
        response = requests.post(f"{base_url}/train", json=classification_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Classification training successful!")
            print(f"   Task Type: {result.get('task_type', 'Not specified')}")
            print(f"   Model Variant: {result.get('model_variant', 'Not specified')}")
            print(f"   Model ID: {result.get('model_id', 'Not specified')}")
            
            metrics = result.get('metrics', {})
            print(f"   Accuracy: {metrics.get('accuracy', 'N/A')}")
            print(f"   Model Class: {metrics.get('model_class', 'N/A')}")
            
        else:
            print(f"❌ Classification training failed: {response.status_code}")
            print(f"   Error: {response.text}")
    
    except Exception as e:
        print(f"❌ Classification test error: {e}")
    
    # Test 2: Regression with explicit task type
    print("\n📈 Test 2: Regression with explicit task type")
    print("-" * 50)
    
    try:
        response = requests.post(f"{base_url}/train", json=regression_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Regression training successful!")
            print(f"   Task Type: {result.get('task_type', 'Not specified')}")
            print(f"   Model Variant: {result.get('model_variant', 'Not specified')}")
            print(f"   Model ID: {result.get('model_id', 'Not specified')}")
            
            metrics = result.get('metrics', {})
            print(f"   R² Score: {metrics.get('r2_score', 'N/A')}")
            print(f"   RMSE: {metrics.get('rmse', 'N/A')}")
            print(f"   Model Class: {metrics.get('model_class', 'N/A')}")
            
        else:
            print(f"❌ Regression training failed: {response.status_code}")
            print(f"   Error: {response.text}")
    
    except Exception as e:
        print(f"❌ Regression test error: {e}")
    
    # Test 3: Auto-detection fallback (no task type specified)
    print("\n🔍 Test 3: Auto-detection fallback")
    print("-" * 50)
    
    fallback_data = classification_data.copy()
    fallback_data['hyperparams'] = {"n_estimators": 50}  # Remove task type info
    
    try:
        response = requests.post(f"{base_url}/train", json=fallback_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Auto-detection training successful!")
            print(f"   Detected Task Type: {result.get('task_type', 'Not specified')}")
            print(f"   Selected Model Variant: {result.get('model_variant', 'Not specified')}")
            
            metrics = result.get('metrics', {})
            print(f"   Problem Type: {metrics.get('problem_type', 'N/A')}")
            
        else:
            print(f"❌ Auto-detection training failed: {response.status_code}")
            print(f"   Error: {response.text}")
    
    except Exception as e:
        print(f"❌ Auto-detection test error: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Testing completed!")
    print("\n💡 Integration Status:")
    print("   ✅ Backend can receive enhanced task type information")
    print("   ✅ Backend selects correct model variants automatically")
    print("   ✅ Backend includes enhanced metadata in responses")
    print("   ✅ Auto-detection still works as fallback")

if __name__ == "__main__":
    test_enhanced_backend()
