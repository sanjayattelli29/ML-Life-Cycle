from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import importlib
import joblib
import os
import uuid
import json
from datetime import datetime
import traceback
import numpy as np

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
        supervised_models = ['random_forest', 'xgboost', 'logistic_regression', 'linear_regression', 'svm']
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
            json.dump(metadata, f, indent=2)
        
        # Prepare enhanced response
        response = {
            "model_id": model_id,
            "metrics": metrics,
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
            response["preview"] = preview_df.head(10).to_dict(orient="records")
        
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
    """Save model to Cloudflare R2"""
    try:
        from utils.save_to_cloudflare import upload_to_cloudflare
        
        req = request.json
        model_id = req.get('model_id')
        
        if not model_id:
            return jsonify({"error": "Missing model_id"}), 400
        
        model_path = f"saved_models/{model_id}.pkl"
        metadata_path = f"saved_models/{model_id}_metadata.json"
        
        if not os.path.exists(model_path):
            return jsonify({"error": "Model not found"}), 404
        
        # Upload model and metadata
        model_response = upload_to_cloudflare(model_path, f"models/{model_id}.pkl")
        metadata_response = upload_to_cloudflare(metadata_path, f"models/{model_id}_metadata.json")
        
        return jsonify({
            "status": "uploaded",
            "model_url": model_response.get("url"),
            "metadata_url": metadata_response.get("url"),
            "model_id": model_id
        })
        
    except Exception as e:
        error_msg = f"Upload failed: {str(e)}"
        app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
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
        
        # Load model and metadata
        model = joblib.load(model_path)
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
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
        
        # Make prediction
        prediction = model.predict(input_df)[0]
        
        # For classification, also get probabilities if available
        result = {
            "prediction": float(prediction) if isinstance(prediction, (int, float, np.integer, np.floating)) else str(prediction),
            "model_id": model_id,
            "features_used": expected_features,
            "input_data": input_data
        }
        
        # Add probabilities for classification models
        if hasattr(model, 'predict_proba') and metadata.get('task_type') == 'classification':
            try:
                probabilities = model.predict_proba(input_df)[0]
                classes = model.classes_ if hasattr(model, 'classes_') else range(len(probabilities))
                result["probabilities"] = {str(cls): float(prob) for cls, prob in zip(classes, probabilities)}
            except:
                pass
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

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
        
        # Parse CSV data
        from io import StringIO
        df = pd.read_csv(StringIO(csv_data))
        
        expected_features = metadata.get('features', [])
        target_column = metadata.get('target')
        
        # Check if we have both features and target
        missing_features = [f for f in expected_features if f not in df.columns]
        if missing_features:
            return jsonify({"error": f"Missing features in test data: {missing_features}"}), 400
        
        # Prepare test data
        X_test = df[expected_features]
        
        # Make predictions
        predictions = model.predict(X_test)
        
        result = {
            "model_id": model_id,
            "test_size": len(X_test),
            "predictions": predictions.tolist(),
            "features_used": expected_features
        }
        
        # If target column exists in test data, calculate metrics
        if target_column and target_column in df.columns:
            y_test = df[target_column]
            
            if metadata.get('task_type') == 'classification':
                from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
                accuracy = accuracy_score(y_test, predictions)
                report = classification_report(y_test, predictions, output_dict=True)
                cm = confusion_matrix(y_test, predictions)
                
                result.update({
                    "accuracy": float(accuracy),
                    "classification_report": report,
                    "confusion_matrix": cm.tolist(),
                    "actual_values": y_test.tolist()
                })
            else:
                from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
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
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
