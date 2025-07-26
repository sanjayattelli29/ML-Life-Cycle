"""
Test script for ML Backend API
Run this script to test the ML backend functionality
"""

import requests
import json
import pandas as pd
import numpy as np

# Configuration
BASE_URL = "http://localhost:5000"
TEST_CSV_URL = "https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv"

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        print("✅ Health check passed")
        print(f"   Response: {response.json()}")
    else:
        print("❌ Health check failed")
        print(f"   Status: {response.status_code}")
    print()

def test_get_models():
    """Test getting available models"""
    print("🔍 Testing available models...")
    response = requests.get(f"{BASE_URL}/models")
    if response.status_code == 200:
        print("✅ Models retrieved successfully")
        models = response.json()
        print(f"   Supervised models: {len(models['supervised']['classification']) + len(models['supervised']['regression'])}")
        print(f"   Unsupervised models: {len(models['unsupervised']['clustering']) + len(models['unsupervised']['anomaly_detection'])}")
    else:
        print("❌ Failed to get models")
        print(f"   Status: {response.status_code}")
    print()

def test_train_classification():
    """Test training a classification model"""
    print("🔍 Testing classification model training...")
    
    # Prepare request for Titanic dataset (classification)
    request_data = {
        "csv_url": TEST_CSV_URL,
        "features": ["Pclass", "Age", "SibSp", "Parch", "Fare"],
        "target": "Survived",
        "test_size": 0.2,
        "model_name": "random_forest",
        "hyperparams": {
            "n_estimators": 50,
            "max_depth": 5
        }
    }
    
    response = requests.post(f"{BASE_URL}/train", json=request_data)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Classification model trained successfully")
        print(f"   Model ID: {result['model_id']}")
        print(f"   Accuracy: {result['metrics'].get('accuracy', 'N/A'):.3f}")
        print(f"   F1 Score: {result['metrics'].get('f1_score', 'N/A'):.3f}")
        return result['model_id']
    else:
        print("❌ Classification training failed")
        print(f"   Status: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Error: {response.text}")
        return None
    print()

def test_train_clustering():
    """Test training a clustering model"""
    print("🔍 Testing clustering model training...")
    
    request_data = {
        "csv_url": TEST_CSV_URL,
        "features": ["Pclass", "Age", "SibSp", "Parch", "Fare"],
        "model_name": "kmeans",
        "hyperparams": {
            "n_clusters": 3
        }
    }
    
    response = requests.post(f"{BASE_URL}/train", json=request_data)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Clustering model trained successfully")
        print(f"   Model ID: {result['model_id']}")
        print(f"   Clusters found: {result['metrics'].get('num_clusters', 'N/A')}")
        print(f"   Silhouette Score: {result['metrics'].get('silhouette_score', 'N/A'):.3f}")
        return result['model_id']
    else:
        print("❌ Clustering training failed")
        print(f"   Status: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Error: {response.text}")
        return None
    print()

def test_prediction(model_id):
    """Test making predictions"""
    if not model_id:
        print("⏭️  Skipping prediction test (no model ID)")
        return
    
    print("🔍 Testing predictions...")
    
    # Test prediction with sample data
    request_data = {
        "model_id": model_id,
        "data": [
            [3, 25, 1, 0, 50.0],  # Sample passenger data
            [1, 35, 0, 1, 100.0]
        ]
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=request_data)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Predictions made successfully")
        print(f"   Predictions: {result['predictions']}")
        if 'probabilities' in result:
            print(f"   Probabilities: {result['probabilities']}")
    else:
        print("❌ Prediction failed")
        print(f"   Status: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Error: {response.text}")
    print()

def test_model_info(model_id):
    """Test getting model information"""
    if not model_id:
        print("⏭️  Skipping model info test (no model ID)")
        return
    
    print("🔍 Testing model info retrieval...")
    
    response = requests.get(f"{BASE_URL}/models/{model_id}")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Model info retrieved successfully")
        print(f"   Model Type: {result.get('model_type', 'N/A')}")
        print(f"   Features: {len(result.get('features', []))}")
        print(f"   Training Samples: {result.get('training_samples', 'N/A')}")
    else:
        print("❌ Model info retrieval failed")
        print(f"   Status: {response.status_code}")
    print()

def run_all_tests():
    """Run all tests"""
    print("🚀 Starting ML Backend API Tests")
    print("=" * 50)
    
    # Test basic endpoints
    test_health_check()
    test_get_models()
    
    # Test model training
    classification_model_id = test_train_classification()
    clustering_model_id = test_train_clustering()
    
    # Test predictions and model info
    test_prediction(classification_model_id)
    test_model_info(classification_model_id)
    
    print("🏁 All tests completed!")
    print("=" * 50)
    
    if classification_model_id:
        print(f"🎯 Classification Model ID: {classification_model_id}")
    if clustering_model_id:
        print(f"🎯 Clustering Model ID: {clustering_model_id}")

if __name__ == "__main__":
    print("ML Backend API Test Suite")
    print("Make sure the Flask app is running on http://localhost:5000")
    input("Press Enter to continue...")
    
    try:
        run_all_tests()
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed! Make sure the Flask app is running.")
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
