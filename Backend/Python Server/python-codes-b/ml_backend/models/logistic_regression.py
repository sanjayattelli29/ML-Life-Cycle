from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import numpy as np
from utils.metrics import calculate_classification_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data, detect_problem_type

def train_model(dataframe, features, target, test_size=0.2, hyperparams=None):
    """
    Train a Logistic Regression model
    
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
        'penalty': 'l2',
        'C': 1.0,
        'solver': 'liblinear',
        'max_iter': 1000,
        'random_state': 42,
        'fit_intercept': True,
        'class_weight': None
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Adjust solver based on penalty
    if default_params['penalty'] == 'l1':
        default_params['solver'] = 'liblinear'
    elif default_params['penalty'] == 'elasticnet':
        default_params['solver'] = 'saga'
    
    # Preprocess data
    processed_df, feature_encoders, target_encoder = preprocess_data(
        dataframe, features, target, 
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': True,  # Logistic regression benefits from scaling
            'remove_outliers': False
        }
    )
    
    # Prepare features and target
    X = processed_df[features]
    y = processed_df[target]
    
    # Verify this is a classification problem
    problem_type = detect_problem_type(y)
    if problem_type != 'classification':
        print(f"Warning: Target appears to be continuous but treating as classification")
    
    # Check if stratification is possible (each class needs at least 2 samples)
    class_counts = y.value_counts()
    min_class_count = class_counts.min()
    
    if min_class_count >= 2:
        stratify = y
        print(f"INFO: Using stratified splitting")
    else:
        stratify = None
        print(f"⚠️ Using random splitting (some classes have <2 samples)")
        print(f"   Class distribution: {dict(class_counts)}")
    
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
    
    # Train the model
    model = LogisticRegression(**default_params)
    
    # Fit with safe parameter handling
    fit_params = {}
    
    # Safely pass only parameters the model accepts
    try:
        model.fit(X_train, y_train, **fit_params)
    except TypeError as e:
        # If any parameter is not supported, try without additional parameters
        print(f"⚠️ LogisticRegression fit with parameters failed: {str(e)}")
        print("   Falling back to standard fit...")
        model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    # Calculate metrics
    metrics = calculate_classification_metrics(y_test, y_pred, y_proba)
    
    # Add model-specific information
    metrics['model_type'] = 'logistic_regression'
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['training_samples'] = len(X_train)
    metrics['test_samples'] = len(X_test)
    metrics['num_classes'] = len(np.unique(y))
    
    # Add coefficients and feature importance
    if hasattr(model, 'coef_'):
        if len(model.classes_) == 2:
            # Binary classification
            coefficients = dict(zip(features, model.coef_[0]))
        else:
            # Multi-class classification - use mean absolute coefficients
            coefficients = dict(zip(features, np.mean(np.abs(model.coef_), axis=0)))
        
        metrics['coefficients'] = {k: float(v) for k, v in coefficients.items()}
        
        # Feature importance based on absolute coefficients
        abs_coefs = {k: abs(v) for k, v in coefficients.items()}
        total_abs_coef = sum(abs_coefs.values())
        if total_abs_coef > 0:
            feature_importance = {k: v/total_abs_coef for k, v in abs_coefs.items()}
            metrics['feature_importance'] = dict(sorted(feature_importance.items(), 
                                                       key=lambda x: x[1], reverse=True))
    
    if hasattr(model, 'intercept_'):
        metrics['intercept'] = model.intercept_.tolist()
    
    # Add class information
    metrics['classes'] = model.classes_.tolist()
    
    # Add performance summary
    metrics['performance_summary'] = get_model_performance_summary(metrics, 'classification')
    
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
        'name': 'Logistic Regression',
        'type': 'supervised',
        'task': 'classification',
        'description': 'Logistic regression uses the logistic function to model the probability of class membership.',
        'hyperparameters': {
            'penalty': {
                'type': 'string',
                'default': 'l2',
                'options': ['l1', 'l2', 'elasticnet', 'none'],
                'description': 'Regularization penalty to apply'
            },
            'C': {
                'type': 'float',
                'default': 1.0,
                'range': [0.001, 1000],
                'description': 'Inverse of regularization strength (smaller = stronger regularization)'
            },
            'solver': {
                'type': 'string',
                'default': 'liblinear',
                'options': ['liblinear', 'lbfgs', 'newton-cg', 'sag', 'saga'],
                'description': 'Algorithm to use for optimization'
            },
            'max_iter': {
                'type': 'integer',
                'default': 1000,
                'range': [100, 10000],
                'description': 'Maximum number of iterations for convergence'
            },
            'class_weight': {
                'type': 'string',
                'default': None,
                'options': [None, 'balanced'],
                'description': 'Weights associated with classes'
            }
        },
        'pros': [
            'Fast training and prediction',
            'Highly interpretable',
            'Provides probability estimates',
            'Less prone to overfitting with regularization',
            'Works well with linearly separable data'
        ],
        'cons': [
            'Assumes linear decision boundary',
            'Sensitive to outliers',
            'May underfit complex data',
            'Requires feature scaling for best performance'
        ],
        'use_cases': [
            'Email spam detection',
            'Medical diagnosis',
            'Marketing response prediction',
            'Binary decision problems'
        ]
    }
