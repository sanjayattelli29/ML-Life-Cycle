from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
try:
    from utils.metrics import calculate_anomaly_detection_metrics, get_model_performance_summary
    from utils.preprocessing import preprocess_data
except ImportError as e:
    print(f"Warning: Could not import utils modules: {e}")
    # Define fallback functions
    def calculate_anomaly_detection_metrics(y_true, y_pred, scores):
        return {'accuracy': 0.0, 'precision': 0.0, 'recall': 0.0, 'f1_score': 0.0}
    def get_model_performance_summary(metrics, task_type):
        return "Performance summary not available"
    def preprocess_data(df, features, target=None, preprocessing_steps=None):
        return df, None, None

def train_model(dataframe, features, hyperparams=None):
    """
    Train an Isolation Forest model for anomaly detection
    
    Args:
        dataframe: Input pandas DataFrame
        features: List of feature column names
        hyperparams: Dictionary of hyperparameters
    
    Returns:
        Trained model, metrics
    """
    if hyperparams is None:
        hyperparams = {}
    
    # Set default hyperparameters
    default_params = {
        'n_estimators': 100,
        'max_samples': 'auto',
        'contamination': 0.1,
        'max_features': 1.0,
        'bootstrap': False,
        'n_jobs': None,
        'random_state': 42,
        'verbose': 0
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Preprocess data
    processed_df, feature_encoders, _ = preprocess_data(
        dataframe, features, target=None,
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': True,  # Isolation Forest benefits from scaling
            'remove_outliers': False  # We want to detect outliers, not remove them
        }
    )
    
    # Prepare features
    X = processed_df[features]
    
    # Ensure all data is numeric and handle any remaining issues
    for feature in features:
        if feature in X.columns:
            # Convert to numeric, coerce errors to NaN
            X[feature] = pd.to_numeric(X[feature], errors='coerce')
    
    # Fill any remaining NaN values
    X = X.fillna(X.mean())
    
    # Ensure we have enough data points
    if len(X) < 2:
        raise ValueError("Not enough data points for anomaly detection. Need at least 2 samples.")
    
    # Train the model
    try:
        model = IsolationForest(**default_params)
        
        # Fit and predict in one step
        anomaly_labels = model.fit_predict(X)
        anomaly_scores = model.decision_function(X)
    except Exception as e:
        raise ValueError(f"Failed to train Isolation Forest model: {str(e)}")
    
    # Create true labels (for demonstration, assume all points are normal)
    # In real scenarios, you might have some known anomalies
    y_true = np.ones(len(X))  # All normal points
    
    # If contamination rate suggests some anomalies, mark lowest scoring points as anomalies
    contamination_rate = default_params['contamination']
    if contamination_rate > 0 and contamination_rate < 1:
        n_anomalies = int(len(X) * contamination_rate)
        anomaly_threshold = np.percentile(anomaly_scores, contamination_rate * 100)
        y_true[anomaly_scores <= anomaly_threshold] = -1
    
    # Calculate metrics
    try:
        metrics = calculate_anomaly_detection_metrics(y_true, anomaly_labels, anomaly_scores)
    except Exception as e:
        # Fallback metrics if calculation fails
        metrics = {
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f1_score': 0.0
        }
    
    # Add model-specific information
    metrics['model_type'] = 'isolation_forest'
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['total_samples'] = len(X)
    
    # Add Isolation Forest specific metrics
    n_anomalies_detected = np.sum(anomaly_labels == -1)
    metrics['anomalies_detected'] = int(n_anomalies_detected)
    metrics['anomaly_detection_rate'] = float(n_anomalies_detected / len(X))
    
    # Anomaly score statistics
    metrics['anomaly_scores'] = {
        'mean': float(np.mean(anomaly_scores)),
        'std': float(np.std(anomaly_scores)),
        'min': float(np.min(anomaly_scores)),
        'max': float(np.max(anomaly_scores)),
        'threshold': float(model.threshold_) if hasattr(model, 'threshold_') else None
    }
    
    # Quartile analysis of anomaly scores
    quartiles = np.percentile(anomaly_scores, [25, 50, 75])
    metrics['score_quartiles'] = {
        'q1': float(quartiles[0]),
        'median': float(quartiles[1]),
        'q3': float(quartiles[2])
    }
    
    # Feature importance (if available)
    # Isolation Forest doesn't have built-in feature importance,
    # but we can estimate it by feature contribution to anomaly scores
    try:
        feature_importance = estimate_feature_importance(model, X, features)
        if feature_importance:
            metrics['feature_importance'] = feature_importance
    except:
        pass
    
    # Add sample results (ALL samples for complete preview)
    # Changed from limiting to 100 samples to include all data points
    sample_size = len(X)  # Use all samples instead of limiting to 100
    anomaly_preview = pd.DataFrame({
        'sample_index': range(sample_size),
        'anomaly_score': anomaly_scores.tolist(),
        'is_anomaly': (anomaly_labels == -1).tolist(),
        'anomaly_label': anomaly_labels.tolist(),
        'anomaly': anomaly_labels.tolist()  # Add anomaly column for consistency with frontend
    })
    
    # Add original feature values for preview (all features)
    for feature in features:  # Include all features, not just first 5
        if feature in X.columns:
            feature_values = X[feature]
            # Ensure we convert to list properly
            anomaly_preview[feature] = [float(val) if pd.notna(val) and val is not None else 0.0 for val in feature_values]
    
    metrics['anomaly_preview'] = anomaly_preview.to_dict(orient='records')
    
    # Analyze anomalies by feature ranges
    if n_anomalies_detected > 0:
        anomaly_mask = anomaly_labels == -1
        normal_mask = anomaly_labels == 1
        
        feature_analysis = {}
        for feature in features:
            if np.sum(anomaly_mask) > 0 and np.sum(normal_mask) > 0 and feature in X.columns:
                try:
                    anomaly_values = X[feature][anomaly_mask]
                    normal_values = X[feature][normal_mask]
                    
                    # Convert to numpy arrays to avoid Series issues
                    anomaly_array = anomaly_values.values if hasattr(anomaly_values, 'values') else anomaly_values
                    normal_array = normal_values.values if hasattr(normal_values, 'values') else normal_values
                    
                    feature_analysis[feature] = {
                        'anomaly_mean': float(np.mean(anomaly_array)),
                        'normal_mean': float(np.mean(normal_array)),
                        'anomaly_std': float(np.std(anomaly_array)),
                        'normal_std': float(np.std(normal_array)),
                        'difference_in_means': float(np.mean(anomaly_array) - np.mean(normal_array))
                    }
                except Exception as e:
                    # Skip this feature if there's an issue
                    continue
        
        metrics['feature_analysis'] = feature_analysis
    
    # Model tree information
    if hasattr(model, 'estimators_'):
        tree_depths = []
        for estimator in model.estimators_:
            if hasattr(estimator, 'tree_'):
                tree_depths.append(estimator.tree_.max_depth)
        
        if tree_depths:
            metrics['tree_statistics'] = {
                'avg_tree_depth': float(np.mean(tree_depths)),
                'max_tree_depth': int(np.max(tree_depths)),
                'min_tree_depth': int(np.min(tree_depths))
            }
    
    # Add performance summary
    metrics['performance_summary'] = get_model_performance_summary(metrics, 'anomaly_detection')
    
    # Store preprocessing information
    metrics['preprocessing'] = {
        'feature_encoders': feature_encoders is not None,
        'scaled_features': True
    }
    
    return model, metrics

def estimate_feature_importance(model, X, features):
    """
    Estimate feature importance by measuring impact on anomaly scores
    
    Args:
        model: Trained Isolation Forest model
        X: Feature matrix
        features: List of feature names
    
    Returns:
        Dictionary of feature importances
    """
    try:
        # Convert to numpy array if it's a DataFrame
        X_array = X.values if hasattr(X, 'values') else X
        baseline_scores = model.decision_function(X_array)
        feature_importance = {}
        
        for i, feature in enumerate(features):
            try:
                # Create a copy of X with this feature permuted
                X_permuted = X_array.copy()
                np.random.shuffle(X_permuted[:, i])
                
                # Calculate new scores
                permuted_scores = model.decision_function(X_permuted)
                
                # Importance is the change in mean absolute score
                importance = np.mean(np.abs(baseline_scores - permuted_scores))
                feature_importance[feature] = float(importance)
            except Exception as e:
                # Skip this feature if there's an issue
                feature_importance[feature] = 0.0
                continue
        
        # Normalize importance scores
        total_importance = sum(feature_importance.values())
        if total_importance > 0:
            feature_importance = {
                k: v / total_importance 
                for k, v in feature_importance.items()
            }
        
        # Sort by importance
        return dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
        
    except Exception as e:
        print(f"Warning: Could not calculate feature importance: {e}")
        return None

def get_model_info():
    """
    Get information about this model
    
    Returns:
        Dictionary with model information
    """
    return {
        'name': 'Isolation Forest',
        'type': 'unsupervised',
        'task': 'anomaly_detection',
        'description': 'Isolation Forest detects anomalies by isolating observations through random feature selection and splits.',
        'hyperparameters': {
            'n_estimators': {
                'type': 'integer',
                'default': 100,
                'range': [50, 1000],
                'description': 'Number of base estimators (trees) in the ensemble'
            },
            'max_samples': {
                'type': 'string_or_int',
                'default': 'auto',
                'options': ['auto'],
                'range': [50, 5000],
                'description': 'Number of samples to draw to train each estimator'
            },
            'contamination': {
                'type': 'float',
                'default': 0.1,
                'range': [0.01, 0.5],
                'description': 'Proportion of outliers in the dataset'
            },
            'max_features': {
                'type': 'float',
                'default': 1.0,
                'range': [0.1, 1.0],
                'description': 'Number of features to draw to train each estimator'
            },
            'bootstrap': {
                'type': 'boolean',
                'default': False,
                'description': 'Whether samples are drawn with replacement'
            }
        },
        'pros': [
            'Linear time complexity',
            'Low memory requirements',
            'No need for labeled data',
            'Effective for high-dimensional data',
            'No assumptions about data distribution',
            'Can handle large datasets efficiently'
        ],
        'cons': [
            'Performance depends on contamination parameter',
            'Less effective in very high dimensions',
            'May not work well with normal data that has many irrelevant features',
            'Difficult to interpret individual predictions',
            'Sensitive to feature scaling'
        ],
        'use_cases': [
            'Fraud detection',
            'Network intrusion detection',
            'Quality control in manufacturing',
            'Medical anomaly detection',
            'Log analysis and monitoring',
            'Outlier detection in data preprocessing'
        ]
    }
