from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import numpy as np
from utils.metrics import calculate_regression_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data, detect_problem_type

def train_model(dataframe, features, target, test_size=0.2, hyperparams=None):
    """
    Train a Linear Regression model
    
    Args:
        dataframe: Input pandas DataFrame
        features: List of feature column names
        target: Target column name
        test_size: Proportion of data for testing (default: 0.2)
        hyperparams: Dictionary of hyperparameters
    
    Returns:
        Trained model, metrics, X_test, y_test, y_pred
    """
    if hyperparams is None:
        hyperparams = {}
    
    # Set default hyperparameters
    default_params = {
        'fit_intercept': True,
        'normalize': False,  # Deprecated in newer versions
        'copy_X': True,
        'n_jobs': None
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Remove 'normalize' parameter if using newer scikit-learn version
    try:
        model = LinearRegression(**default_params)
    except TypeError:
        # Remove normalize parameter for newer sklearn versions
        if 'normalize' in default_params:
            del default_params['normalize']
        model = LinearRegression(**default_params)
    
    # Preprocess data
    processed_df, feature_encoders, target_encoder = preprocess_data(
        dataframe, features, target, 
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': True,  # Linear regression benefits from scaling
            'remove_outliers': False
        }
    )
    
    # Prepare features and target
    X = processed_df[features]
    y = processed_df[target]
    
    # Verify this is a regression problem
    problem_type = detect_problem_type(y)
    if problem_type != 'regression':
        # Force regression by treating as continuous
        print(f"Warning: Target appears to be categorical but treating as regression")
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42
    )
    
    # Train the model with safe parameter handling
    fit_params = {}
    
    # Safely pass only parameters the model accepts
    try:
        model.fit(X_train, y_train, **fit_params)
    except TypeError as e:
        # If any parameter is not supported, try without additional parameters
        print(f"⚠️ LinearRegression fit with parameters failed: {str(e)}")
        print("   Falling back to standard fit...")
        model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    metrics = calculate_regression_metrics(y_test, y_pred)
    
    # Add model-specific information
    metrics['model_type'] = 'linear_regression'
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['training_samples'] = len(X_train)
    metrics['test_samples'] = len(X_test)
    
    # Add coefficients and feature importance
    if hasattr(model, 'coef_'):
        coefficients = dict(zip(features, model.coef_))
        metrics['coefficients'] = {k: float(v) for k, v in coefficients.items()}
        
        # Feature importance based on absolute coefficients
        abs_coefs = {k: abs(v) for k, v in coefficients.items()}
        total_abs_coef = sum(abs_coefs.values())
        if total_abs_coef > 0:
            feature_importance = {k: v/total_abs_coef for k, v in abs_coefs.items()}
            metrics['feature_importance'] = dict(sorted(feature_importance.items(), 
                                                       key=lambda x: x[1], reverse=True))
    
    if hasattr(model, 'intercept_'):
        metrics['intercept'] = float(model.intercept_)
    
    # Add performance summary
    metrics['performance_summary'] = get_model_performance_summary(metrics, 'regression')
    
    # Store preprocessing information
    metrics['preprocessing'] = {
        'feature_encoders': feature_encoders is not None,
        'target_encoder': target_encoder is not None,
        'scaled_features': True
    }
    
    return model, metrics, X_test, y_test, y_pred

def get_model_info():
    """
    Get information about this model
    
    Returns:
        Dictionary with model information
    """
    return {
        'name': 'Linear Regression',
        'type': 'supervised',
        'task': 'regression',
        'description': 'Linear regression fits a linear model with coefficients to minimize the residual sum of squares.',
        'hyperparameters': {
            'fit_intercept': {
                'type': 'boolean',
                'default': True,
                'description': 'Whether to calculate the intercept for this model'
            },
            'copy_X': {
                'type': 'boolean', 
                'default': True,
                'description': 'If True, X will be copied; else, it may be overwritten'
            },
            'n_jobs': {
                'type': 'integer',
                'default': None,
                'description': 'Number of jobs to use for computation'
            }
        },
        'pros': [
            'Fast training and prediction',
            'Highly interpretable',
            'No hyperparameter tuning required',
            'Works well with linear relationships'
        ],
        'cons': [
            'Assumes linear relationship',
            'Sensitive to outliers',
            'May underfit complex data',
            'Requires feature scaling for best performance'
        ],
        'use_cases': [
            'Predicting house prices',
            'Sales forecasting',
            'Simple trend analysis',
            'Baseline model for comparison'
        ]
    }
