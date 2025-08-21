import xgboost as xgb
from sklearn.model_selection import train_test_split
import numpy as np
import pandas as pd
from utils.metrics import calculate_classification_metrics, calculate_regression_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data, detect_problem_type

# Helper function to safely convert NumPy types to Python native types
def safe_convert(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, dict):
        return {k: safe_convert(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_convert(item) for item in obj]
    else:
        return obj

def train_model(dataframe, features, target, test_size=0.2, hyperparams=None, task_type=None, model_variant=None):
    """
    Train an XGBoost model with enhanced task type detection
    
    Args:
        dataframe: Input pandas DataFrame
        features: List of feature column names
        target: Target column name
        test_size: Proportion of data for testing (default: 0.2)
        hyperparams: Dictionary of hyperparameters
        task_type: Explicitly specified task type ('classification' or 'regression')
        model_variant: Specific model variant (e.g., 'XGBClassifier', 'XGBRegressor')
    
    Returns:
        Trained model, metrics, X_test, y_test, y_pred
    """
    if hyperparams is None:
        hyperparams = {}
    
    # Set default hyperparameters
    default_params = {
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'subsample': 1.0,
        'colsample_bytree': 1.0,
        'reg_alpha': 0,
        'reg_lambda': 1,
        'random_state': 42,
        'n_jobs': -1,
        'verbosity': 0
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Preprocess data
    processed_df, feature_encoders, target_encoder = preprocess_data(
        dataframe, features, target, 
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': False,  # XGBoost handles different scales well
            'remove_outliers': False
        }
    )
    
    # Ensure all feature columns are numeric (XGBoost requirement)
    print(f"Feature data types before conversion: {processed_df[features].dtypes}")
    for feature in features:
        processed_df[feature] = pd.to_numeric(processed_df[feature], errors='coerce')
    
    # Fill any NaN values that might have been created during conversion
    processed_df[features] = processed_df[features].fillna(0)
    print(f"Feature data types after conversion: {processed_df[features].dtypes}")
    
    # Prepare features and target
    X = processed_df[features]
    y = processed_df[target]
    
    # Enhanced: Use provided task type or auto-detect
    if task_type:
        problem_type = task_type
        print(f"DEBUG: Using explicitly provided task type: {task_type}")
        if model_variant:
            print(f"DEBUG: Using model variant: {model_variant}")
    else:
        # Fallback to auto-detection
        problem_type = detect_problem_type(y)
        print(f"DEBUG: Auto-detected problem type: {problem_type}")
    
    # Choose appropriate model and objective based on task type
    # Remove any parameters that might cause issues
    clean_params = default_params.copy()
    clean_params.pop('early_stopping_rounds', None)
    
    try:
        if problem_type == 'classification':
            num_classes = len(np.unique(y))
            if num_classes == 2:
                clean_params['objective'] = 'binary:logistic'
                clean_params['eval_metric'] = 'logloss'
            else:
                clean_params['objective'] = 'multi:softprob'
                clean_params['eval_metric'] = 'mlogloss'
                clean_params['num_class'] = num_classes
            
            # Try to initialize classifier with clean parameters
            try:
                model = xgb.XGBClassifier(**clean_params)
                print(f"INFO: Created XGBClassifier with parameters: {clean_params}")
            except TypeError as e:
                print(f"⚠️ Error creating XGBClassifier with all parameters: {e}")
                # Try with minimal parameters
                model = xgb.XGBClassifier(
                    n_estimators=100, 
                    learning_rate=0.1,
                    random_state=42
                )
                print("INFO: Created XGBClassifier with minimal parameters")
            
            # Check if stratification is possible (each class needs at least 2 samples)
            class_counts = y.value_counts()
            min_class_count = class_counts.min()
            
            if min_class_count >= 2:
                stratify = y
                print(f"INFO: Selected XGBClassifier with stratified splitting")
            else:
                stratify = None
                print(f"WARN: Selected XGBClassifier with random splitting (some classes have <2 samples)")
                print(f"   Class distribution: {dict(class_counts)}")
        else:
            clean_params['objective'] = 'reg:squarederror'
            clean_params['eval_metric'] = 'rmse'
            
            # Try to initialize regressor with clean parameters
            try:
                model = xgb.XGBRegressor(**clean_params)
                print(f"INFO: Created XGBRegressor with parameters: {clean_params}")
            except TypeError as e:
                print(f"⚠️ Error creating XGBRegressor with all parameters: {e}")
                # Try with minimal parameters
                model = xgb.XGBRegressor(
                    n_estimators=100,
                    learning_rate=0.1,
                    random_state=42
                )
                print("INFO: Created XGBRegressor with minimal parameters")
                
            stratify = None
            print(f"INFO: Selected XGBRegressor")
    except Exception as e:
        print(f"❌ Error initializing XGBoost model: {e}")
        raise ValueError(f"Failed to initialize XGBoost model: {str(e)}")
    
    # Split the data with proper stratification handling
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=stratify
        )
    except ValueError as e:
        # Fallback to non-stratified split if stratification fails
        print(f"⚠️ Stratified split failed: {str(e)}")
        print("   Falling back to random split...")
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=None
        )
    
    # Train the model with proper parameter handling based on XGBoost version (3.0.0)
    # In XGBoost 3.0.0, API has changed and early_stopping_rounds now belongs in fit_params
    print(f"INFO: Training XGBoost model of type: {type(model).__name__}")
    
    # For XGBoost 3.0.0+, we need different parameter handling
    # First, try minimal approach - just train without eval or early stopping
    try:
        print("INFO: Training with basic parameters only")
        # Convert all data to float to avoid categorical data errors
        X_train_float = X_train.astype(float)
        X_test_float = X_test.astype(float)
        model.fit(X_train_float, y_train)
    except Exception as e:
        print(f"⚠️ Initial XGBoost training failed: {str(e)}")
        try:
            print("INFO: Trying with enable_categorical=True")
            if hasattr(model, 'set_params'):
                model.set_params(enable_categorical=True)
            model.fit(X_train, y_train)
        except Exception as e2:
            print(f"❌ XGBoost training failed completely: {str(e2)}")
            raise ValueError(f"XGBoost training error: {str(e2)}")
        
    # Make predictions with error handling
    try:
        # Make prediction using the float-converted test data
        y_pred = model.predict(X_test_float)
        print("INFO: Prediction successful")
    except Exception as e:
        print(f"❌ Initial prediction failed: {str(e)}")
        try:
            print("INFO: Trying prediction with explicit float conversion")
            X_test_float2 = X_test.astype(float)
            y_pred = model.predict(X_test_float2)
            print("INFO: Prediction successful after type conversion")
        except Exception as e2:
            print(f"❌ Prediction failed completely: {str(e2)}")
            raise ValueError(f"XGBoost prediction error: {str(e2)}")
    
    # Calculate metrics based on problem type with error handling
    try:
        if problem_type == 'classification':
            # Try to get prediction probabilities
            try:
                y_proba = model.predict_proba(X_test)
            except Exception as e:
                print(f"⚠️ Could not get prediction probabilities: {str(e)}")
                y_proba = None
                
            metrics = calculate_classification_metrics(y_test, y_pred, y_proba)
            metrics['num_classes'] = int(len(np.unique(y)))  # Convert to Python int
            
            if hasattr(model, 'classes_'):
                metrics['classes'] = model.classes_.tolist()  # Convert ndarray to list
            else:
                metrics['classes'] = np.unique(y).tolist()  # Convert ndarray to list
        else:
            metrics = calculate_regression_metrics(y_test, y_pred)
            
        # Convert any NumPy types in metrics to Python native types
        metrics = safe_convert(metrics)
    except Exception as e:
        print(f"❌ Metrics calculation failed: {str(e)}")
        # Provide default metrics
        if problem_type == 'classification':
            metrics = {'accuracy': 0, 'f1_score': 0, 'precision': 0, 'recall': 0}
        else:
            metrics = {'r2_score': 0, 'mse': 0, 'rmse': 0, 'mae': 0}
    
    # Add enhanced model information
    metrics['model_type'] = 'xgboost'
    metrics['problem_type'] = problem_type
    metrics['task_type'] = task_type or problem_type  # Include explicit task type
    metrics['model_variant'] = model_variant or (
        'XGBClassifier' if problem_type == 'classification' else 'XGBRegressor'
    )
    metrics['model_class'] = type(model).__name__
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['training_samples'] = len(X_train)
    metrics['test_samples'] = len(X_test)
    
    # Add XGBoost-specific metrics with error handling
    try:
        n_estimators = getattr(model, 'n_estimators', 100)
        best_iteration = getattr(model, 'best_iteration_', n_estimators)
        metrics['best_iteration'] = best_iteration
        metrics['n_estimators_used'] = best_iteration
    except Exception as e:
        print(f"⚠️ Could not get best_iteration: {str(e)}")
        metrics['best_iteration'] = 100
        metrics['n_estimators_used'] = 100
    
    # Add feature importance with error handling
    try:
        if hasattr(model, 'feature_importances_'):
            feature_importance = dict(zip(features, model.feature_importances_))
            metrics['feature_importance'] = dict(sorted(feature_importance.items(), 
                                                   key=lambda x: x[1], reverse=True))
    except Exception as e:
        print(f"⚠️ Could not get feature importance: {str(e)}")
        metrics['feature_importance'] = {}
    
    # Get training history if available with error handling
    try:
        if hasattr(model, 'evals_result_'):
            evals_result = model.evals_result_
            metrics['training_history'] = {}
            
            for eval_name, eval_metrics in evals_result.items():
                metrics['training_history'][eval_name] = {
                    metric_name: metric_values[-10:]  # Last 10 values to reduce size
                    for metric_name, metric_values in eval_metrics.items()
                }
    except Exception as e:
        print(f"⚠️ Could not get evaluation history: {str(e)}")
        metrics['training_history'] = {}
    
    # Add tree information with error handling
    try:
        if hasattr(model, 'get_booster'):
            booster = model.get_booster()
            try:
                tree_info = booster.trees_to_dataframe()
                if not tree_info.empty:
                    metrics['tree_statistics'] = {
                        'total_nodes': len(tree_info),
                        'total_trees': tree_info['Tree'].nunique(),
                        'avg_tree_depth': float(tree_info['Depth'].mean()),
                        'max_tree_depth': int(tree_info['Depth'].max())
                    }
            except Exception as e:
                print(f"⚠️ Could not get tree info: {str(e)}")
                metrics['tree_statistics'] = {}
    except Exception as e:
        print(f"⚠️ Could not get booster: {str(e)}")
        metrics['tree_statistics'] = {}
    
    # Add performance summary
    metrics['performance_summary'] = get_model_performance_summary(metrics, problem_type)
    
    # Store preprocessing information
    metrics['preprocessing'] = {
        'feature_encoders': feature_encoders is not None,
        'target_encoder': target_encoder is not None,
        'scaled_features': False
    }
    
    return model, metrics, X_test, y_test, y_pred

def get_model_info():
    """
    Get information about this model
    
    Returns:
        Dictionary with model information
    """
    return {
        'name': 'XGBoost',
        'type': 'supervised',
        'task': 'both',  # Can handle both classification and regression
        'description': 'XGBoost is an optimized gradient boosting framework that builds models sequentially, with each model correcting errors from previous ones.',
        'hyperparameters': {
            'n_estimators': {
                'type': 'integer',
                'default': 100,
                'range': [50, 1000],
                'description': 'Number of boosting rounds'
            },
            'max_depth': {
                'type': 'integer',
                'default': 6,
                'range': [3, 15],
                'description': 'Maximum depth of trees'
            },
            'learning_rate': {
                'type': 'float',
                'default': 0.1,
                'range': [0.01, 0.3],
                'description': 'Step size shrinkage to prevent overfitting'
            },
            'subsample': {
                'type': 'float',
                'default': 1.0,
                'range': [0.6, 1.0],
                'description': 'Fraction of samples used for training each tree'
            },
            'colsample_bytree': {
                'type': 'float',
                'default': 1.0,
                'range': [0.6, 1.0],
                'description': 'Fraction of features used for training each tree'
            },
            'reg_alpha': {
                'type': 'float',
                'default': 0,
                'range': [0, 10],
                'description': 'L1 regularization term'
            },
            'reg_lambda': {
                'type': 'float',
                'default': 1,
                'range': [0, 10],
                'description': 'L2 regularization term'
            }
        },
        'pros': [
            'Excellent performance on structured data',
            'Handles missing values automatically',
            'Built-in regularization',
            'Efficient and fast training',
            'Provides feature importance',
            'Early stopping to prevent overfitting',
            'Works well with mixed data types'
        ],
        'cons': [
            'Can overfit on small datasets',
            'Many hyperparameters to tune',
            'Less interpretable than linear models',
            'Memory intensive for large datasets',
            'Sensitive to outliers'
        ],
        'use_cases': [
            'Structured/tabular data competitions',
            'Feature importance analysis',
            'High-accuracy predictions',
            'Mixed data types',
            'When gradient boosting is suitable'
        ]
    }
