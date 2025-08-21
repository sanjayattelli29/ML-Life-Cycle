#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os

# Ensure UTF-8 encoding for stdout/stderr to handle emojis and special characters
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Set environment variables for UTF-8
os.environ['PYTHONIOENCODING'] = 'utf-8'

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import pandas as pd
import importlib
import joblib
import uuid
import json
from datetime import datetime
import traceback
import numpy as np
import zipfile
import tempfile
from io import StringIO
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Define custom JSON encoder to handle NumPy types
class NumpyJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super(NumpyJSONEncoder, self).default(obj)

# Load environment variables
load_dotenv()

# Add current directory to Python path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Change working directory to the ml_backend directory
os.chdir(current_dir)

# Helper function to convert NumPy types to Python native types
def convert_numpy_types(obj):
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return convert_numpy_types(obj.tolist())
    elif isinstance(obj, np.bool_):
        return bool(obj)
    else:
        return obj

app = Flask(__name__)
CORS(app)

# Ensure saved_models directory exists
os.makedirs('saved_models', exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available models"""
    models = {
        "supervised": {
            "classification": [
                {"name": "logistic_regression", "display_name": "Logistic Regression"},
                {"name": "random_forest", "display_name": "Random Forest"},
                {"name": "svm", "display_name": "Support Vector Machine"},
                {"name": "xgboost_model", "display_name": "XGBoost"}
            ],
            "regression": [
                {"name": "linear_regression", "display_name": "Linear Regression"},
                {"name": "random_forest", "display_name": "Random Forest"},
                {"name": "svm", "display_name": "Support Vector Machine"},
                {"name": "xgboost_model", "display_name": "XGBoost"}
            ]
        },
        "unsupervised": {
            "clustering": [
                {"name": "kmeans", "display_name": "K-Means"},
                {"name": "dbscan", "display_name": "DBSCAN"}
            ],
            "anomaly_detection": [
                {"name": "isolation_forest", "display_name": "Isolation Forest"}
            ]
        }
    }
    return jsonify(models)

@app.route('/train', methods=['POST'])
def train_model():
    """Train a machine learning model with enhanced task type detection"""
    try:
        req = request.json
        
        # Validate required fields
        if 'csv_data' not in req and 'csv_url' not in req:
            return jsonify({"error": "Either 'csv_data' or 'csv_url' is required"}), 400
        
        if 'features' not in req:
            return jsonify({"error": "Missing required field: features"}), 400
            
        if 'model_name' not in req:
            return jsonify({"error": "Missing required field: model_name"}), 400
        
        csv_url = req.get('csv_url')
        csv_data = req.get('csv_data')
        features = req['features']
        target = req.get('target')  # Optional for unsupervised learning
        test_size = req.get('test_size', 0.2)
        model_name = req['model_name']
        hyperparams = req.get('hyperparams', {})
        
        # ✨ NEW: Extract task type information from hyperparams
        task_type = hyperparams.get('task_type', 'classification')
        model_variant = hyperparams.get('model_variant', None)
        
        # Remove task metadata from hyperparams before passing to model
        clean_hyperparams = hyperparams.copy()
        clean_hyperparams.pop('task_type', None)
        clean_hyperparams.pop('model_variant', None)
        
        # Debug logging
        print(f"DEBUG: Enhanced training request received:")
        print(f"  model_name: {model_name}")
        print(f"  task_type: {task_type}")
        print(f"  model_variant: {model_variant}")
        print(f"  features: {features}")
        print(f"  target: {target}")
        print(f"  test_size: {test_size}")
        print(f"  clean_hyperparams: {clean_hyperparams}")
        
        # Validate parameters
        if not features or len(features) == 0:
            return jsonify({"error": "No features provided. Please select features for training."}), 400
        
        # Check if this is a supervised or unsupervised model
        supervised_models = ['random_forest', 'xgboost_model', 'logistic_regression', 'linear_regression', 'svm']
        unsupervised_models = ['kmeans', 'dbscan', 'isolation_forest']
        
        if model_name in supervised_models and not target:
            return jsonify({"error": f"Model '{model_name}' requires a target column for supervised learning. Please specify a target column."}), 400
        
        if model_name in unsupervised_models and target:
            print(f"Warning: Target column provided for unsupervised model '{model_name}', ignoring target.")
        
        # Load data
        try:
            if csv_data:
                # Load from CSV data string
                from io import StringIO
                df = pd.read_csv(StringIO(csv_data))
            elif csv_url:
                # Load from URL (fallback)
                df = pd.read_csv(csv_url)
            else:
                return jsonify({"error": "Either csv_url or csv_data must be provided"}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to load CSV: {str(e)}"}), 400
        
        # Validate features exist in dataframe
        missing_features = [f for f in features if f not in df.columns]
        if missing_features:
            return jsonify({"error": f"Features not found in dataset: {missing_features}"}), 400
        
        # Validate target column if provided
        if target and target not in df.columns:
            return jsonify({"error": f"Target column '{target}' not found in dataset"}), 400
        
        # Import and run the model
        try:
            model_module = importlib.import_module(f"models.{model_name}")
        except ImportError:
            return jsonify({"error": f"Model '{model_name}' not found"}), 400
        
        # ✨ Enhanced: Train the model with task type information
        if target:
            # Supervised learning with enhanced task type info
            result = model_module.train_model(
                df, features, target, test_size, clean_hyperparams,
                task_type=task_type, model_variant=model_variant
            )
        else:
            # Unsupervised learning
            result = model_module.train_model(df, features, clean_hyperparams)
        
        model, metrics = result[0], result[1]
        
        # Generate unique model ID and save
        model_id = str(uuid.uuid4())
        model_path = f"saved_models/{model_id}.pkl"
        joblib.dump(model, model_path)
        
        # Save metadata with enhanced information
        metadata = {
            "model_id": model_id,
            "model_name": model_name,
            "task_type": task_type,
            "model_variant": model_variant,
            "features": features,
            "target": target,
            "hyperparams": clean_hyperparams,
            "original_hyperparams": hyperparams,  # Keep original for reference
            "metrics": metrics,
            "created_at": datetime.now().isoformat(),
            "csv_url": csv_url
        }
        
        metadata_path = f"saved_models/{model_id}_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, cls=NumpyJSONEncoder)
        
        # Prepare enhanced response with NumPy type conversion
        response = {
            "model_id": model_id,
            "metrics": convert_numpy_types(metrics),  # Convert NumPy types to Python native types
            "model_name": model_name,
            "task_type": task_type,
            "model_variant": model_variant,
            "created_at": metadata["created_at"],
            "features": features,
            "feature_columns": features,  # Add this for frontend compatibility
            "target": target
        }
        
        # Add preview for supervised learning
        if len(result) > 2:
            X_test, y_test, y_pred = result[2], result[3], result[4]
            preview_df = pd.DataFrame({
                'actual': y_test.values if hasattr(y_test, 'values') else y_test,
                'predicted': y_pred
            })
            # Convert DataFrame to dict and ensure all NumPy types are converted
            preview_dict = preview_df.head(10).to_dict(orient="records")
            response["preview"] = convert_numpy_types(preview_dict)
        
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Training failed: {str(e)}"
        app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        return jsonify({"error": error_msg}), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Make predictions using a trained model"""
    try:
        req = request.json
        model_id = req.get('model_id')
        data = req.get('data')  # Should be a list of feature values or DataFrame-like structure
        
        if not model_id or not data:
            return jsonify({"error": "Missing model_id or data"}), 400
        
        # Load model
        model_path = f"saved_models/{model_id}.pkl"
        if not os.path.exists(model_path):
            return jsonify({"error": "Model not found"}), 404
        
        model = joblib.load(model_path)
        
        # Load metadata
        metadata_path = f"saved_models/{model_id}_metadata.json"
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Prepare data for prediction
        if isinstance(data, list):
            # Single prediction
            df = pd.DataFrame([data], columns=metadata['features'])
        else:
            # Multiple predictions
            df = pd.DataFrame(data)
        
        # Make predictions
        predictions = model.predict(df)
        
        # Get prediction probabilities if available (classification)
        probabilities = None
        if hasattr(model, 'predict_proba'):
            try:
                probabilities = model.predict_proba(df).tolist()
            except:
                pass
        
        response = {
            "predictions": predictions.tolist() if hasattr(predictions, 'tolist') else predictions,
            "model_id": model_id,
            "model_name": metadata['model_name']
        }
        
        if probabilities:
            response["probabilities"] = probabilities
        
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Prediction failed: {str(e)}"
        app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        return jsonify({"error": error_msg}), 500

@app.route('/save', methods=['POST'])
def save_model_to_cloud():
    """Save model to Cloudflare R2 with organized structure: userid/dataset/model_files"""
    try:
        from utils.save_to_cloudflare import upload_to_cloudflare
        
        req = request.json
        model_id = req.get('model_id')
        user_id = req.get('user_id')  # NEW: Get user ID
        dataset_name = req.get('dataset_name', 'unknown_dataset')  # NEW: Get dataset name
        
        if not model_id:
            return jsonify({"error": "Missing model_id"}), 400
            
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
        
        model_path = f"saved_models/{model_id}.pkl"
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        if not os.path.exists(model_path):
            return jsonify({"error": "Model not found"}), 404
        
        # NEW: Organize files in R2 with user/dataset structure
        # Format: models/{user_id}/{dataset_name}/{model_id}.pkl
        r2_model_path = f"models/{user_id}/{dataset_name}/{model_id}.pkl"
        r2_metadata_path = f"models/{user_id}/{dataset_name}/{model_id}_metadata.json"
        
        print(f"📤 Uploading model to R2:")
        print(f"  Model: {r2_model_path}")
        print(f"  Metadata: {r2_metadata_path}")
        
        # Upload model and metadata to organized R2 structure
        model_response = upload_to_cloudflare(model_path, r2_model_path)
        metadata_response = upload_to_cloudflare(metadata_path, r2_metadata_path)
        
        # Update metadata with R2 paths
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            metadata.update({
                "r2_model_path": r2_model_path,
                "r2_metadata_path": r2_metadata_path,
                "user_id": user_id,
                "dataset_name": dataset_name,
                "saved_to_cloud": True,
                "cloud_uploaded_at": datetime.now().isoformat()
            })
            
            # Save updated metadata locally and upload again
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Re-upload updated metadata
            metadata_response = upload_to_cloudflare(metadata_path, r2_metadata_path)
        
        print(f"✅ Model upload successful:")
        print(f"  Model response: {model_response}")
        print(f"  Metadata response: {metadata_response}")
        
        return jsonify({
            "status": "uploaded",
            "model_url": model_response.get("url"),
            "metadata_url": metadata_response.get("url"),
            "model_id": model_id,
            "user_id": user_id,
            "dataset_name": dataset_name,
            "r2_paths": {
                "model": r2_model_path,
                "metadata": r2_metadata_path
            }
        })
        
    except Exception as e:
        error_msg = f"Upload failed: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({"error": error_msg}), 500

@app.route('/models/<user_id>/<dataset_name>/<model_id>/download', methods=['GET'])
def download_model_zip(user_id, dataset_name, model_id):
    """Download model and metadata as ZIP file from R2"""
    temp_zip_path = None
    try:
        import zipfile
        import tempfile
        from utils.save_to_cloudflare import download_from_cloudflare
        
        print(f"🔽 Download request for model:")
        print(f"  User: {user_id}")
        print(f"  Dataset: {dataset_name}")
        print(f"  Model: {model_id}")
        
        # Define R2 paths
        r2_model_path = f"models/{user_id}/{dataset_name}/{model_id}.pkl"
        r2_metadata_path = f"models/{user_id}/{dataset_name}/{model_id}_metadata.json"
        
        # Create a temp directory OUTSIDE the app directory to avoid file watcher issues
        import tempfile
        temp_dir = tempfile.mkdtemp(prefix='model_download_')
        
        print(f"📁 Using temp directory: {temp_dir}")
        
        # Download files from R2 to temp directory
        temp_model_path = os.path.join(temp_dir, f"{model_id}.pkl")
        temp_metadata_path = os.path.join(temp_dir, f"{model_id}_metadata.json")
        temp_zip_path = os.path.join(temp_dir, f"{model_id}_model.zip")
        
        print(f"📥 Downloading from R2...")
        model_download = download_from_cloudflare(r2_model_path, temp_model_path)
        metadata_download = download_from_cloudflare(r2_metadata_path, temp_metadata_path)
        
        if model_download["status"] != "success":
            return jsonify({"error": f"Failed to download model: {model_download.get('message', 'Unknown error')}"}), 500
        
        if metadata_download["status"] != "success":
            return jsonify({"error": f"Failed to download metadata: {metadata_download.get('message', 'Unknown error')}"}), 500
        
        print(f"📦 Creating ZIP file: {temp_zip_path}")
        
        # Create ZIP file
        with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add model file
            if os.path.exists(temp_model_path):
                zipf.write(temp_model_path, f"{model_id}.pkl")
                print(f"  ✅ Added model file: {model_id}.pkl")
            
            # Add metadata file
            if os.path.exists(temp_metadata_path):
                zipf.write(temp_metadata_path, f"{model_id}_metadata.json")
                print(f"  ✅ Added metadata file: {model_id}_metadata.json")
            
            # Add README
            readme_content = f"""# Machine Learning Model Package
            
Model ID: {model_id}
Dataset: {dataset_name}
User: {user_id}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Files Included:
- {model_id}.pkl: Trained model (use joblib.load() to load)
- {model_id}_metadata.json: Model metadata and training information

## Usage:
```python
import joblib
import pandas as pd

# Load the model
model = joblib.load('{model_id}.pkl')

# Make predictions
# predictions = model.predict(your_data)
```

For more information, check the metadata file.
"""
            zipf.writestr("README.md", readme_content)
            print(f"  ✅ Added README.md")
        
        print(f"✅ ZIP file created successfully: {temp_zip_path}")
        
        # Read file into memory and create response immediately
        with open(temp_zip_path, 'rb') as f:
            file_data = f.read()
        
        print(f"📤 File read into memory ({len(file_data)} bytes), cleaning up temp files...")
        
        # Clean up ALL temp files immediately
        try:
            if os.path.exists(temp_model_path):
                os.remove(temp_model_path)
                print(f"🗑️ Cleaned up: {temp_model_path}")
        except Exception as e:
            print(f"⚠️ Could not clean up model file: {e}")
        
        try:
            if os.path.exists(temp_metadata_path):
                os.remove(temp_metadata_path)
                print(f"🗑️ Cleaned up: {temp_metadata_path}")
        except Exception as e:
            print(f"⚠️ Could not clean up metadata file: {e}")
        
        try:
            if os.path.exists(temp_zip_path):
                os.remove(temp_zip_path)
                print(f"🗑️ Cleaned up: {temp_zip_path}")
        except Exception as e:
            print(f"⚠️ Could not clean up ZIP file: {e}")
        
        try:
            os.rmdir(temp_dir)
            print(f"🗑️ Cleaned up temp directory: {temp_dir}")
        except Exception as e:
            print(f"⚠️ Could not clean up temp directory: {e}")
        
        # Create response with the file data
        from flask import Response
        
        response = Response(
            file_data,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{model_id}_model.zip"',
                'Content-Length': str(len(file_data))
            }
        )
        
        print(f"✅ Sending ZIP response ({len(file_data)} bytes)")
        return response
            
    except Exception as e:
        error_msg = f"Download failed: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        
        # Clean up on error
        if temp_zip_path and os.path.exists(temp_zip_path):
            try:
                # Get the temp directory from the zip path
                temp_dir = os.path.dirname(temp_zip_path)
                
                # Clean up all files in temp directory
                for file in os.listdir(temp_dir):
                    try:
                        os.remove(os.path.join(temp_dir, file))
                    except:
                        pass
                
                # Remove temp directory
                try:
                    os.rmdir(temp_dir)
                    print(f"🗑️ Cleaned up temp directory after error: {temp_dir}")
                except:
                    pass
                    
            except Exception as cleanup_error:
                print(f"⚠️ Error during cleanup: {cleanup_error}")
        
        return jsonify({"error": error_msg}), 500

@app.route('/models/<user_id>/<dataset_name>', methods=['GET'])
def list_user_dataset_models(user_id, dataset_name):
    """List all models for a specific user and dataset from R2"""
    try:
        from utils.save_to_cloudflare import get_r2_client
        
        client = get_r2_client()
        if not client:
            return jsonify({"error": "Failed to connect to R2"}), 500
        
        bucket_name = os.getenv('CLOUDFLARE_R2_BUCKET_NAME')
        prefix = f"models/{user_id}/{dataset_name}/"
        
        print(f"📋 Listing models for {user_id}/{dataset_name}")
        
        # List objects with the specific prefix
        response = client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix
        )
        
        models = []
        model_files = {}
        
        # Group files by model ID
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = os.path.basename(key)
            
            if filename.endswith('.pkl'):
                model_id = filename.replace('.pkl', '')
                model_files[model_id] = model_files.get(model_id, {})
                model_files[model_id]['model_file'] = key
                model_files[model_id]['last_modified'] = obj['LastModified'].isoformat()
                model_files[model_id]['size'] = obj['Size']
            elif filename.endswith('_metadata.json'):
                model_id = filename.replace('_metadata.json', '')
                model_files[model_id] = model_files.get(model_id, {})
                model_files[model_id]['metadata_file'] = key
        
        # Convert to list format
        for model_id, files in model_files.items():
            if 'model_file' in files:  # Only include if model file exists
                models.append({
                    'model_id': model_id,
                    'user_id': user_id,
                    'dataset_name': dataset_name,
                    'model_file': files['model_file'],
                    'metadata_file': files.get('metadata_file'),
                    'last_modified': files.get('last_modified'),
                    'size_bytes': files.get('size'),
                    'download_url': f"/models/{user_id}/{dataset_name}/{model_id}/download"
                })
        
        print(f"✅ Found {len(models)} models")
        
        return jsonify({
            "models": models,
            "user_id": user_id,
            "dataset_name": dataset_name,
            "total_count": len(models)
        })
        
    except Exception as e:
        error_msg = f"Failed to list models: {str(e)}"
        print(f"❌ {error_msg}")
        return jsonify({"error": error_msg}), 500

@app.route('/models/<model_id>', methods=['GET'])
def get_model_info(model_id):
    """Get information about a specific model"""
    try:
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        if not os.path.exists(metadata_path):
            return jsonify({"error": "Model not found"}), 404
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        return jsonify(metadata)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models/<model_id>', methods=['DELETE'])
def delete_model(model_id):
    """Delete a model and its metadata"""
    try:
        model_path = f"saved_models/{model_id}.pkl"
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        deleted_files = []
        if os.path.exists(model_path):
            os.remove(model_path)
            deleted_files.append("model")
        
        if os.path.exists(metadata_path):
            os.remove(metadata_path)
            deleted_files.append("metadata")
        
        if not deleted_files:
            return jsonify({"error": "Model not found"}), 404
        
        return jsonify({
            "message": "Model deleted successfully",
            "deleted": deleted_files,
            "model_id": model_id
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models/<model_id>/download', methods=['GET'])
def download_model(model_id):
    """Download a trained model (.pkl file)"""
    try:
        model_path = f"saved_models/{model_id}.pkl"
        
        if not os.path.exists(model_path):
            return jsonify({"error": "Model file not found"}), 404
        
        return send_file(
            model_path,
            as_attachment=True,
            download_name=f"{model_id}.pkl",
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models/<model_id>/code', methods=['GET'])
def get_training_code(model_id):
    """Get the Python training code for the model"""
    try:
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        if not os.path.exists(metadata_path):
            return jsonify({"error": "Model metadata not found"}), 404
        
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Generate Python training code
        model_name = metadata.get('model_name', 'unknown')
        features = metadata.get('features', [])
        target = metadata.get('target')
        hyperparams = metadata.get('hyperparams', {})
        task_type = metadata.get('task_type', 'classification')
        
        # Determine if this is supervised or unsupervised
        is_unsupervised = model_name in ['kmeans', 'dbscan', 'isolation_forest']
        
        # Generate imports and model class based on model type
        if model_name == 'kmeans':
            model_import = "from sklearn.cluster import KMeans"
            model_class = "KMeans"
            metrics_import = "from sklearn.metrics import silhouette_score"
        elif model_name == 'isolation_forest':
            model_import = "from sklearn.ensemble import IsolationForest"
            model_class = "IsolationForest"
            metrics_import = "import numpy as np"
        elif model_name == 'random_forest':
            if task_type == 'classification':
                model_import = "from sklearn.ensemble import RandomForestClassifier"
                model_class = "RandomForestClassifier"
            else:
                model_import = "from sklearn.ensemble import RandomForestRegressor"
                model_class = "RandomForestRegressor"
            metrics_import = "from sklearn.metrics import accuracy_score, classification_report, mean_squared_error, r2_score"
        elif model_name == 'logistic_regression':
            model_import = "from sklearn.linear_model import LogisticRegression"
            model_class = "LogisticRegression"
            metrics_import = "from sklearn.metrics import accuracy_score, classification_report"
        elif model_name == 'linear_regression':
            model_import = "from sklearn.linear_model import LinearRegression"
            model_class = "LinearRegression"
            metrics_import = "from sklearn.metrics import mean_squared_error, r2_score"
        else:
            model_import = f"# Import for {model_name}"
            model_class = model_name
            metrics_import = "# Import metrics as needed"
        
        # Format hyperparameters
        hyperparam_str = ", ".join([f"{k}={repr(v)}" for k, v in hyperparams.items()])
        
        if is_unsupervised:
            # Generate unsupervised learning code
            if model_name == 'kmeans':
                training_code = f"""# K-Means Clustering Training Code for Model: {model_id}
# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

import pandas as pd
import joblib
{model_import}
from sklearn.preprocessing import StandardScaler
{metrics_import}
import matplotlib.pyplot as plt

# Load your dataset
df = pd.read_csv('your_dataset.csv')

# Define features (no target needed for clustering)
features = {features}
X = df[features]

# Preprocess the data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Initialize and train the model
model = {model_class}({hyperparam_str})
cluster_labels = model.fit_predict(X_scaled)

# Add cluster labels to original dataframe
df['cluster'] = cluster_labels

# Evaluate clustering
silhouette_avg = silhouette_score(X_scaled, cluster_labels)
print(f"Silhouette Score: {{silhouette_avg:.4f}}")

# Print cluster information
unique_clusters = np.unique(cluster_labels)
for cluster in unique_clusters:
    cluster_size = np.sum(cluster_labels == cluster)
    print(f"Cluster {{cluster}}: {{cluster_size}} points ({{cluster_size/len(X)*100:.1f}}%)")

# Save the model and scaler
joblib.dump(model, '{model_id}_kmeans.pkl')
joblib.dump(scaler, '{model_id}_scaler.pkl')
print("Model and scaler saved successfully!")

# To load the model later:
# loaded_model = joblib.load('{model_id}_kmeans.pkl')
# loaded_scaler = joblib.load('{model_id}_scaler.pkl')
# new_data_scaled = loaded_scaler.transform(new_data)
# predictions = loaded_model.predict(new_data_scaled)

# Visualize clusters (for 2D data)
if len(features) >= 2:
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(X_scaled[:, 0], X_scaled[:, 1], c=cluster_labels, cmap='viridis')
    plt.colorbar(scatter)
    plt.title('K-Means Clustering Results')
    plt.xlabel(features[0])
    plt.ylabel(features[1])
    plt.show()
"""
            elif model_name == 'isolation_forest':
                training_code = f"""# Isolation Forest Anomaly Detection Training Code for Model: {model_id}
# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

import pandas as pd
import joblib
{model_import}
from sklearn.preprocessing import StandardScaler
{metrics_import}
import matplotlib.pyplot as plt

# Load your dataset
df = pd.read_csv('your_dataset.csv')

# Define features (no target needed for anomaly detection)
features = {features}
X = df[features]

# Preprocess the data
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Initialize and train the model
model = {model_class}({hyperparam_str})
anomaly_labels = model.fit_predict(X_scaled)
anomaly_scores = model.decision_function(X_scaled)

# Add anomaly information to original dataframe
df['anomaly_label'] = anomaly_labels  # 1 = normal, -1 = anomaly
df['anomaly_score'] = anomaly_scores
df['is_anomaly'] = (anomaly_labels == -1)

# Analyze results
n_anomalies = np.sum(anomaly_labels == -1)
total_points = len(X)
anomaly_rate = n_anomalies / total_points * 100

print(f"Total data points: {{total_points}}")
print(f"Anomalies detected: {{n_anomalies}} ({{anomaly_rate:.2f}}%)")
print(f"Normal points: {{total_points - n_anomalies}} ({{100 - anomaly_rate:.2f}}%)")

# Show some anomaly examples
print("\\nTop 5 most anomalous points:")
anomaly_df = df[df['is_anomaly']].nsmallest(5, 'anomaly_score')
print(anomaly_df[features + ['anomaly_score']])

# Save the model and scaler
joblib.dump(model, '{model_id}_isolation_forest.pkl')
joblib.dump(scaler, '{model_id}_scaler.pkl')
print("\\nModel and scaler saved successfully!")

# To load the model later:
# loaded_model = joblib.load('{model_id}_isolation_forest.pkl')
# loaded_scaler = joblib.load('{model_id}_scaler.pkl')
# new_data_scaled = loaded_scaler.transform(new_data)
# predictions = loaded_model.predict(new_data_scaled)
# scores = loaded_model.decision_function(new_data_scaled)

# Visualize anomalies (for 2D data)
if len(features) >= 2:
    plt.figure(figsize=(12, 5))
    
    # Plot 1: Anomaly labels
    plt.subplot(1, 2, 1)
    colors = ['red' if label == -1 else 'blue' for label in anomaly_labels]
    plt.scatter(X_scaled[:, 0], X_scaled[:, 1], c=colors, alpha=0.6)
    plt.title('Anomaly Detection Results')
    plt.xlabel(features[0])
    plt.ylabel(features[1])
    plt.legend(['Normal', 'Anomaly'])
    
    # Plot 2: Anomaly scores
    plt.subplot(1, 2, 2)
    scatter = plt.scatter(X_scaled[:, 0], X_scaled[:, 1], c=anomaly_scores, cmap='viridis')
    plt.colorbar(scatter)
    plt.title('Anomaly Scores')
    plt.xlabel(features[0])
    plt.ylabel(features[1])
    
    plt.tight_layout()
    plt.show()
"""
        else:
            # Generate supervised learning code (existing logic)
            training_code = f"""# Training Code for Model: {model_id}
# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

import pandas as pd
import joblib
{model_import}
from sklearn.model_selection import train_test_split
{metrics_import}

# Load your dataset
df = pd.read_csv('your_dataset.csv')

# Define features and target
features = {features}
target = '{target}'

X = df[features]
y = df[target]

# Split the data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size={metadata.get('test_size', 0.2)}, 
    random_state={metadata.get('random_state', 42)}
)

# Initialize and train the model
model = {model_class}({hyperparam_str})
model.fit(X_train, y_train)

# Make predictions
y_pred = model.predict(X_test)

# Evaluate the model
{'# Classification metrics' if task_type == 'classification' else '# Regression metrics'}
{'accuracy = accuracy_score(y_test, y_pred)' if task_type == 'classification' else 'mse = mean_squared_error(y_test, y_pred)'}
{'print(f"Accuracy: {{accuracy:.4f}}")' if task_type == 'classification' else 'r2 = r2_score(y_test, y_pred)'}
{'print(classification_report(y_test, y_pred))' if task_type == 'classification' else 'print(f"MSE: {{mse:.4f}}")'}
{'# Additional metrics...' if task_type == 'classification' else 'print(f"R² Score: {{r2:.4f}}")'}

# Save the model
joblib.dump(model, '{model_id}.pkl')
print("Model saved successfully!")

# To load the model later:
# loaded_model = joblib.load('{model_id}.pkl')
# predictions = loaded_model.predict(new_data)
"""
        
        return jsonify({
            "model_id": model_id,
            "training_code": training_code,
            "metadata": metadata
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models/<model_id>/predict', methods=['POST'])
def predict_with_model(model_id):
    """Make predictions using a trained model"""
    try:
        model_path = f"saved_models/{model_id}.pkl"
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        if not os.path.exists(model_path) or not os.path.exists(metadata_path):
            return jsonify({"error": "Model or metadata not found"}), 404
        
        # Load model and metadata with error handling
        try:
            model = joblib.load(model_path)
            print(f"Model loaded successfully: {type(model).__name__}")
        except Exception as e:
            print(f"❌ Error loading model: {str(e)}")
            return jsonify({"error": f"Failed to load model: {str(e)}"}), 500
            
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        except Exception as e:
            print(f"❌ Error loading metadata: {str(e)}")
            return jsonify({"error": f"Failed to load metadata: {str(e)}"}), 500
        
        data = request.get_json()
        input_data = data.get('input_data', {})
        
        # Validate input features
        expected_features = metadata.get('features', [])
        missing_features = [f for f in expected_features if f not in input_data]
        
        if missing_features:
            return jsonify({
                "error": f"Missing features: {missing_features}",
                "expected_features": expected_features
            }), 400
        
        # Prepare input data
        input_df = pd.DataFrame([input_data])
        input_df = input_df[expected_features]  # Ensure correct order
        
        # Ensure all columns are numeric (convert string/object types)
        print(f"Input data types before conversion: {input_df.dtypes}")
        for col in input_df.columns:
            input_df[col] = pd.to_numeric(input_df[col], errors='coerce')
        print(f"Input data types after conversion: {input_df.dtypes}")
        
        # Check for NaN values from failed conversions
        nan_columns = input_df.columns[input_df.isna().any()].tolist()
        if nan_columns:
            print(f"Warning: Failed to convert columns to numeric: {nan_columns}")
            # Fill NaN values with column means or zeros
            input_df.fillna(0, inplace=True)
        
        # Make prediction
        try:
            prediction = model.predict(input_df)[0]
            print(f"Prediction successful: {prediction}")
        except Exception as e:
            print(f"❌ Prediction error: {str(e)}")
            # Try with more explicit type conversion if needed
            try:
                input_df = input_df.astype(float)
                prediction = model.predict(input_df)[0]
                print(f"Prediction successful after explicit type conversion: {prediction}")
            except Exception as e2:
                print(f"❌ Prediction failed after type conversion: {str(e2)}")
                raise ValueError(f"Failed to make prediction: {str(e2)}")
        
        # For classification, also get probabilities if available
        # Convert prediction to appropriate Python type
        if isinstance(prediction, (np.integer, np.floating)):
            prediction_value = float(prediction)
        elif isinstance(prediction, np.ndarray):
            prediction_value = float(prediction[0]) if len(prediction) > 0 else 0.0
        else:
            prediction_value = prediction
            
        result = {
            "prediction": prediction_value,
            "model_id": model_id,
            "features_used": expected_features,
            "input_data": input_data
        }
        
        # Add probabilities for classification models
        if hasattr(model, 'predict_proba') and metadata.get('task_type') == 'classification':
            try:
                probabilities = model.predict_proba(input_df)[0]
                # Convert NumPy types to native Python types
                probabilities = [float(p) for p in probabilities]
                classes = model.classes_ if hasattr(model, 'classes_') else range(len(probabilities))
                result["probabilities"] = {str(cls): float(prob) for cls, prob in zip(classes, probabilities)}
            except:
                pass
        
        # Convert any NumPy types and ensure all values are JSON serializable
        result = convert_numpy_types(result)
        return jsonify(result)
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Prediction with model error: {error_msg}")
        print(traceback.format_exc())
        return jsonify({"error": error_msg, "traceback": traceback.format_exc()}), 500

@app.route('/models/<model_id>/test', methods=['POST'])
def test_model_on_data(model_id):
    """Test model on provided test data"""
    try:
        model_path = f"saved_models/{model_id}.pkl"
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        if not os.path.exists(model_path) or not os.path.exists(metadata_path):
            return jsonify({"error": "Model or metadata not found"}), 404
        
        # Load model and metadata
        model = joblib.load(model_path)
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        data = request.get_json()
        csv_data = data.get('csv_data')
        
        if not csv_data:
            return jsonify({"error": "No CSV data provided"}), 400
        
        print(f"DEBUG: Testing model {model_id}")
        print(f"DEBUG: Expected features: {metadata.get('features', [])}")
        print(f"DEBUG: Target column: {metadata.get('target')}")
        
        # Parse CSV data
        from io import StringIO
        df = pd.read_csv(StringIO(csv_data))
        
        print(f"DEBUG: Test data columns: {list(df.columns)}")
        print(f"DEBUG: Test data shape: {df.shape}")
        
        expected_features = metadata.get('features', [])
        target_column = metadata.get('target')
        
        # Check if we have both features and target
        missing_features = [f for f in expected_features if f not in df.columns]
        if missing_features:
            return jsonify({"error": f"Missing features in test data: {missing_features}. Available columns: {list(df.columns)}"}), 400
        
        # Prepare test data - ensure column order matches training
        X_test = df[expected_features].copy()
        
        print(f"DEBUG: X_test shape: {X_test.shape}")
        print(f"DEBUG: X_test columns: {list(X_test.columns)}")
        print(f"DEBUG: X_test sample:\n{X_test.head()}")
        
        # Handle any data preprocessing that might be needed
        # Convert any string/object columns to numeric if needed
        for col in X_test.columns:
            if X_test[col].dtype == 'object':
                try:
                    # Try to convert to numeric
                    X_test[col] = pd.to_numeric(X_test[col], errors='coerce')
                except:
                    # If conversion fails, keep as is
                    pass
        
        # Check for NaN values and handle them
        if X_test.isnull().any().any():
            print("WARNING: Found NaN values in test data, filling with 0")
            X_test = X_test.fillna(0)
        
        # Make predictions
        print(f"DEBUG: Making predictions with model type: {type(model)}")
        predictions = model.predict(X_test)
        print(f"DEBUG: Predictions shape: {predictions.shape}")
        print(f"DEBUG: Sample predictions: {predictions[:5]}")
        
        result = {
            "model_id": model_id,
            "test_size": len(X_test),
            "predictions": predictions.tolist(),
            "features_used": expected_features
        }
        
        # If target column exists in test data, calculate metrics
        if target_column and target_column in df.columns:
            y_test = df[target_column].copy()
            
            # Handle target preprocessing if needed
            if y_test.dtype == 'object':
                try:
                    y_test = pd.to_numeric(y_test, errors='coerce')
                except:
                    pass
            
            # Fill NaN in target if any
            if y_test.isnull().any():
                y_test = y_test.fillna(0)
            
            print(f"DEBUG: y_test shape: {y_test.shape}")
            print(f"DEBUG: y_test sample: {y_test.head()}")
            
            if metadata.get('task_type') == 'classification':
                from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
                try:
                    accuracy = accuracy_score(y_test, predictions)
                    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)
                    cm = confusion_matrix(y_test, predictions)
                    
                    result.update({
                        "accuracy": float(accuracy),
                        "classification_report": report,
                        "confusion_matrix": cm.tolist(),
                        "actual_values": y_test.tolist()
                    })
                except Exception as e:
                    print(f"ERROR calculating classification metrics: {e}")
                    result.update({
                        "accuracy": 0.0,
                        "error_calculating_metrics": str(e),
                        "actual_values": y_test.tolist()
                    })
            else:
                from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
                try:
                    mse = mean_squared_error(y_test, predictions)
                    r2 = r2_score(y_test, predictions)
                    mae = mean_absolute_error(y_test, predictions)
                    
                    result.update({
                        "mse": float(mse),
                        "rmse": float(np.sqrt(mse)),
                        "r2_score": float(r2),
                        "mae": float(mae),
                        "actual_values": y_test.tolist()
                    })
                except Exception as e:
                    print(f"ERROR calculating regression metrics: {e}")
                    result.update({
                        "mse": 0.0,
                        "rmse": 0.0,
                        "r2_score": 0.0,
                        "mae": 0.0,
                        "error_calculating_metrics": str(e),
                        "actual_values": y_test.tolist()
                    })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"ERROR in test_model_on_data: {e}")
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/save-ai-analysis-metadata', methods=['POST'])
def save_ai_analysis_metadata():
    """Save model metadata specifically for AI analysis to R2 storage"""
    try:
        from utils.save_to_cloudflare import upload_to_cloudflare
        
        req = request.json
        model_id = req.get('model_id')
        user_id = req.get('user_id')
        dataset_id = req.get('dataset_id')
        metadata = req.get('metadata')
        
        if not all([model_id, user_id, dataset_id, metadata]):
            return jsonify({"error": "Missing required fields: model_id, user_id, dataset_id, metadata"}), 400
        
        print(f"💾 Saving AI analysis metadata to R2...")
        print(f"  User ID: {user_id}")
        print(f"  Dataset ID: {dataset_id}")
        print(f"  Model ID: {model_id}")
        
        # Create temporary JSON file for AI analysis
        temp_filename = f"ai_analysis_{model_id}.json"
        temp_path = f"saved_models/{temp_filename}"
        
        # Save metadata to temporary file
        with open(temp_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Upload to R2 in aianalysis folder structure
        r2_ai_path = f"aianalysis/{user_id}/{dataset_id}/{model_id}.json"
        
        print(f"📤 Uploading AI analysis file to R2: {r2_ai_path}")
        upload_response = upload_to_cloudflare(temp_path, r2_ai_path)
        
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            "success": True,
            "message": "AI analysis metadata saved to R2",
            "r2_path": r2_ai_path,
            "model_id": model_id,
            "dataset_id": dataset_id,
            "saved_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error saving AI analysis metadata: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/list-ai-analysis-files', methods=['GET'])
def list_ai_analysis_files():
    """List available AI analysis files from R2 storage"""
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        user_id = request.args.get('user_id')
        dataset_id = request.args.get('dataset_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
        
        print(f"🔍 Listing AI analysis files from R2...")
        print(f"  User ID: {user_id}")
        print(f"  Dataset ID: {dataset_id}")
        
        # Configure R2 client with correct environment variables
        r2_client = boto3.client(
            's3',
            endpoint_url=os.getenv('CLOUDFLARE_R2_ENDPOINT', 'https://my-datasets.r2.cloudflarestorage.com'),
            aws_access_key_id=os.getenv('CLOUDFLARE_R2_ACCESS_KEY') or os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('CLOUDFLARE_R2_SECRET_KEY') or os.getenv('R2_SECRET_ACCESS_KEY'),
            region_name='auto'
        )
        
        bucket_name = os.getenv('CLOUDFLARE_R2_BUCKET_NAME', 'my-datasets')
        
        # List files in the aianalysis folder for this user
        prefix = f"aianalysis/{user_id}/"
        if dataset_id:
            prefix += f"{dataset_id}/"
        
        response = r2_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix
        )
        
        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                if key.endswith('.json'):
                    # Extract model_id from filename
                    filename = key.split('/')[-1]
                    model_id = filename.replace('.json', '')
                    
                    # Extract dataset_id from path
                    path_parts = key.split('/')
                    file_dataset_id = path_parts[2] if len(path_parts) > 2 else 'unknown'
                    
                    files.append({
                        "model_id": model_id,
                        "dataset_id": file_dataset_id,
                        "file_path": key,
                        "size": obj['Size'],
                        "last_modified": obj['LastModified'].isoformat(),
                        "saved_at": obj['LastModified'].isoformat(),
                        "model_name": f"AI Analysis Model {model_id[:8]}"
                    })
        
        print(f"📊 Found {len(files)} AI analysis files")
        
        return jsonify({
            "success": True,
            "files": files,
            "total_count": len(files),
            "prefix": prefix
        })
        
    except Exception as e:
        print(f"❌ Error listing AI analysis files: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/download-ai-analysis-file', methods=['GET'])
def download_ai_analysis_file():
    """Download specific AI analysis file from R2 storage"""
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        user_id = request.args.get('user_id')
        model_id = request.args.get('model_id')
        dataset_id = request.args.get('dataset_id')
        
        if not all([user_id, model_id]):
            return jsonify({"error": "Missing required parameters: user_id, model_id"}), 400
        
        print(f"📥 Downloading AI analysis file from R2...")
        print(f"  User ID: {user_id}")
        print(f"  Model ID: {model_id}")
        print(f"  Dataset ID: {dataset_id}")
        
        # Configure R2 client with correct environment variables
        r2_client = boto3.client(
            's3',
            endpoint_url=os.getenv('CLOUDFLARE_R2_ENDPOINT', 'https://my-datasets.r2.cloudflarestorage.com'),
            aws_access_key_id=os.getenv('CLOUDFLARE_R2_ACCESS_KEY') or os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('CLOUDFLARE_R2_SECRET_KEY') or os.getenv('R2_SECRET_ACCESS_KEY'),
            region_name='auto'
        )
        
        bucket_name = os.getenv('CLOUDFLARE_R2_BUCKET_NAME', 'my-datasets')
        
        # Construct the R2 path
        if dataset_id:
            r2_path = f"aianalysis/{user_id}/{dataset_id}/{model_id}.json"
        else:
            # Try to find the file by listing
            prefix = f"aianalysis/{user_id}/"
            response = r2_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix
            )
            
            r2_path = None
            if 'Contents' in response:
                for obj in response['Contents']:
                    if obj['Key'].endswith(f"{model_id}.json"):
                        r2_path = obj['Key']
                        break
            
            if not r2_path:
                return jsonify({"error": f"AI analysis file not found for model {model_id}"}), 404
        
        print(f"📥 Downloading from R2 path: {r2_path}")
        
        # Download the file content
        response = r2_client.get_object(
            Bucket=bucket_name,
            Key=r2_path
        )
        
        # Parse JSON content
        content = response['Body'].read().decode('utf-8')
        metadata = json.loads(content)
        
        print(f"✅ Successfully downloaded AI analysis file")
        
        return jsonify(metadata)
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            return jsonify({"error": f"AI analysis file not found: {model_id}"}), 404
        else:
            print(f"❌ R2 error downloading AI analysis file: {e}")
            return jsonify({"error": f"R2 error: {error_code}"}), 500
    except Exception as e:
        print(f"❌ Error downloading AI analysis file: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
