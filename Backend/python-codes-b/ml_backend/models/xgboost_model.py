import xgboost as xgb
from sklearn.model_selection import train_test_split
import numpy as np
from utils.metrics import calculate_classification_metrics, calculate_regression_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data, detect_problem_type

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
    if problem_type == 'classification':
        num_classes = len(np.unique(y))
        if num_classes == 2:
            default_params['objective'] = 'binary:logistic'
            default_params['eval_metric'] = 'logloss'
        else:
            default_params['objective'] = 'multi:softprob'
            default_params['eval_metric'] = 'mlogloss'
            default_params['num_class'] = num_classes
        
        model = xgb.XGBClassifier(**default_params)
        
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
        default_params['objective'] = 'reg:squarederror'
        default_params['eval_metric'] = 'rmse'
        model = xgb.XGBRegressor(**default_params)
        stratify = None
        print(f"INFO: Selected XGBRegressor")
    
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
    
    # Train the model with early stopping
    eval_set = [(X_train, y_train), (X_test, y_test)]
    
    model.fit(
        X_train, y_train,
        eval_set=eval_set,
        early_stopping_rounds=20,
        verbose=False
    )
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics based on problem type
    if problem_type == 'classification':
        y_proba = model.predict_proba(X_test)
        metrics = calculate_classification_metrics(y_test, y_pred, y_proba)
        metrics['num_classes'] = len(np.unique(y))
        metrics['classes'] = model.classes_.tolist()
    else:
        metrics = calculate_regression_metrics(y_test, y_pred)
    
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
    
    # Add XGBoost-specific metrics
    metrics['best_iteration'] = getattr(model, 'best_iteration', model.n_estimators)
    metrics['n_estimators_used'] = metrics['best_iteration']
    
    # Add feature importance
    if hasattr(model, 'feature_importances_'):
        feature_importance = dict(zip(features, model.feature_importances_))
        metrics['feature_importance'] = dict(sorted(feature_importance.items(), 
                                                   key=lambda x: x[1], reverse=True))
    
    # Get training history if available
    if hasattr(model, 'evals_result_'):
        evals_result = model.evals_result_
        metrics['training_history'] = {}
        
        for eval_name, eval_metrics in evals_result.items():
            metrics['training_history'][eval_name] = {
                metric_name: metric_values[-10:]  # Last 10 values to reduce size
                for metric_name, metric_values in eval_metrics.items()
            }
    
    # Add tree information
    if hasattr(model, 'get_booster'):
        try:
            booster = model.get_booster()
            tree_info = booster.trees_to_dataframe()
            if not tree_info.empty:
                metrics['tree_statistics'] = {
                    'total_nodes': len(tree_info),
                    'total_trees': tree_info['Tree'].nunique(),
                    'avg_tree_depth': float(tree_info['Depth'].mean()),
                    'max_tree_depth': int(tree_info['Depth'].max())
                }
        except:
            pass
    
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
