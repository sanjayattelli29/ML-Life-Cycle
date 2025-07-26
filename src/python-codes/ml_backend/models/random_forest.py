from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
import numpy as np
from utils.metrics import calculate_classification_metrics, calculate_regression_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data, detect_problem_type

def train_model(dataframe, features, target, test_size=0.2, hyperparams=None, task_type=None, model_variant=None):
    """
    Train a Random Forest model with enhanced task type detection
    
    Args:
        dataframe: Input pandas DataFrame
        features: List of feature column names
        target: Target column name
        test_size: Proportion of data for testing (default: 0.2)
        hyperparams: Dictionary of hyperparameters
        task_type: Explicitly specified task type ('classification' or 'regression')
        model_variant: Specific model variant (e.g., 'RandomForestClassifier', 'RandomForestRegressor')
    
    Returns:
        Trained model, metrics, X_test, y_test, y_pred
    """
    if hyperparams is None:
        hyperparams = {}
    
    # Set default hyperparameters
    default_params = {
        'n_estimators': 100,
        'max_depth': None,
        'min_samples_split': 2,
        'min_samples_leaf': 1,
        'max_features': 'sqrt',  # Safe default for both classification and regression
        'bootstrap': True,
        'random_state': 42,
        'n_jobs': -1
    }
    
    # Update with provided hyperparameters, but sanitize max_features
    default_params.update(hyperparams)
    
    # Ensure max_features is never 'auto' (deprecated)
    if default_params.get('max_features') == 'auto':
        default_params['max_features'] = 'sqrt'
    
    # Preprocess data
    processed_df, feature_encoders, target_encoder = preprocess_data(
        dataframe, features, target, 
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': False,  # Random Forest doesn't require scaling
            'remove_outliers': False
        }
    )
    
    # Prepare features and target
    X = processed_df[features]
    y = processed_df[target]
    
    # ✨ Enhanced: Use provided task type or auto-detect
    if task_type:
        problem_type = task_type
        print(f"🎯 Using explicitly provided task type: {task_type}")
        if model_variant:
            print(f"🤖 Using model variant: {model_variant}")
    else:
        # Fallback to auto-detection
        problem_type = detect_problem_type(y)
        print(f"🔍 Auto-detected problem type: {problem_type}")
    
    # Choose appropriate model based on task type
    if problem_type == 'classification':
        model = RandomForestClassifier(**default_params)
        stratify = y
        print(f"✅ Selected RandomForestClassifier")
    else:
        # For regression, use None as max_features (equivalent to all features)
        if default_params.get('max_features') == 'sqrt':
            default_params['max_features'] = None
        model = RandomForestRegressor(**default_params)
        stratify = None
        print(f"✅ Selected RandomForestRegressor")
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=stratify
    )
    
    # Train the model
    model.fit(X_train, y_train)
    
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
    metrics['model_type'] = 'random_forest'
    metrics['problem_type'] = problem_type
    metrics['task_type'] = task_type or problem_type  # Include explicit task type
    metrics['model_variant'] = model_variant or (
        'RandomForestClassifier' if problem_type == 'classification' else 'RandomForestRegressor'
    )
    metrics['model_class'] = type(model).__name__
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['training_samples'] = len(X_train)
    metrics['test_samples'] = len(X_test)
    metrics['n_estimators_used'] = model.n_estimators
    
    # Add feature importance
    if hasattr(model, 'feature_importances_'):
        feature_importance = dict(zip(features, model.feature_importances_))
        metrics['feature_importance'] = dict(sorted(feature_importance.items(), 
                                                   key=lambda x: x[1], reverse=True))
    
    # Add tree-specific metrics
    if hasattr(model, 'estimators_'):
        tree_depths = [tree.tree_.max_depth for tree in model.estimators_]
        metrics['tree_statistics'] = {
            'avg_tree_depth': float(np.mean(tree_depths)),
            'max_tree_depth': int(np.max(tree_depths)),
            'min_tree_depth': int(np.min(tree_depths))
        }
    
    # Add out-of-bag score if available
    if default_params.get('bootstrap', True):
        try:
            # Create a new model with oob_score=True to get OOB score
            oob_model = type(model)(oob_score=True, **default_params)
            oob_model.fit(X_train, y_train)
            metrics['oob_score'] = float(oob_model.oob_score_)
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
        'name': 'Random Forest',
        'type': 'supervised',
        'task': 'both',  # Can handle both classification and regression
        'description': 'Random Forest builds multiple decision trees and combines their predictions through voting or averaging.',
        'hyperparameters': {
            'n_estimators': {
                'type': 'integer',
                'default': 100,
                'range': [10, 1000],
                'description': 'Number of trees in the forest'
            },
            'max_depth': {
                'type': 'integer',
                'default': None,
                'range': [1, 50],
                'description': 'Maximum depth of trees (None for unlimited)'
            },
            'min_samples_split': {
                'type': 'integer',
                'default': 2,
                'range': [2, 20],
                'description': 'Minimum samples required to split an internal node'
            },
            'min_samples_leaf': {
                'type': 'integer',
                'default': 1,
                'range': [1, 20],
                'description': 'Minimum samples required to be at a leaf node'
            },
            'max_features': {
                'type': 'string',
                'default': 'sqrt',
                'options': ['sqrt', 'log2', None],
                'description': 'Number of features to consider when looking for best split'
            },
            'bootstrap': {
                'type': 'boolean',
                'default': True,
                'description': 'Whether bootstrap samples are used when building trees'
            }
        },
        'pros': [
            'Excellent performance on many datasets',
            'Handles missing values and outliers well',
            'Provides feature importance',
            'Reduces overfitting compared to single trees',
            'Works with both numerical and categorical features',
            'Minimal hyperparameter tuning required'
        ],
        'cons': [
            'Can overfit on very noisy data',
            'Less interpretable than single decision trees',
            'Memory intensive for large datasets',
            'Biased towards features with more levels'
        ],
        'use_cases': [
            'Feature selection and importance ranking',
            'Complex pattern recognition',
            'Mixed data types (numerical and categorical)',
            'When high accuracy is important',
            'Baseline model for many ML problems'
        ]
    }
