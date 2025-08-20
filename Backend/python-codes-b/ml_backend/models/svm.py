from sklearn.svm import SVC, SVR
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import numpy as np
from utils.metrics import calculate_classification_metrics, calculate_regression_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data, detect_problem_type

def train_model(dataframe, features, target, test_size=0.2, hyperparams=None, task_type=None, model_variant=None):
    """
    Train a Support Vector Machine model with enhanced task type detection
    
    Args:
        dataframe: Input pandas DataFrame
        features: List of feature column names
        target: Target column name
        test_size: Proportion of data for testing (default: 0.2)
        hyperparams: Dictionary of hyperparameters
        task_type: Explicitly specified task type ('classification' or 'regression')
        model_variant: Specific model variant (e.g., 'SVC', 'SVR')
    
    Returns:
        Trained model, metrics, X_test, y_test, y_pred
    """
    if hyperparams is None:
        hyperparams = {}
    
    # Set default hyperparameters
    default_params = {
        'C': 1.0,
        'kernel': 'rbf',
        'gamma': 'scale',
        'degree': 3,
        'coef0': 0.0,
        'shrinking': True,
        'probability': True,  # For classification
        'tol': 1e-3,
        'cache_size': 200,
        'max_iter': -1,
        'random_state': 42
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Preprocess data
    processed_df, feature_encoders, target_encoder = preprocess_data(
        dataframe, features, target, 
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': True,  # SVM requires feature scaling
            'remove_outliers': False
        }
    )
    
    # Prepare features and target
    X = processed_df[features]
    y = processed_df[target]
    
    # Detect problem type
    problem_type = detect_problem_type(y)
    
    # Choose appropriate model and remove incompatible parameters
    if problem_type == 'classification':
        # Remove SVR-specific parameters
        svm_params = {k: v for k, v in default_params.items() 
                     if k not in ['epsilon']}
        model = SVC(**svm_params)
        
        # Check if stratification is possible (each class needs at least 2 samples)
        class_counts = y.value_counts()
        min_class_count = class_counts.min()
        
        if min_class_count >= 2:
            stratify = y
            print(f"INFO: Using stratified splitting for SVC")
        else:
            stratify = None
            print(f"⚠️ Using random splitting for SVC (some classes have <2 samples)")
            print(f"   Class distribution: {dict(class_counts)}")
    else:
        # Remove SVC-specific parameters and add SVR-specific ones
        svm_params = {k: v for k, v in default_params.items() 
                     if k not in ['probability']}
        svm_params['epsilon'] = hyperparams.get('epsilon', 0.1)
        model = SVR(**svm_params)
        stratify = None
    
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
    model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics based on problem type
    if problem_type == 'classification':
        y_proba = None
        if hasattr(model, 'predict_proba'):
            try:
                y_proba = model.predict_proba(X_test)
            except:
                pass
        metrics = calculate_classification_metrics(y_test, y_pred, y_proba)
        metrics['num_classes'] = len(np.unique(y))
        metrics['classes'] = model.classes_.tolist()
    else:
        metrics = calculate_regression_metrics(y_test, y_pred)
    
    # Add model-specific information
    metrics['model_type'] = 'svm'
    metrics['problem_type'] = problem_type
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['training_samples'] = len(X_train)
    metrics['test_samples'] = len(X_test)
    
    # Add SVM-specific metrics
    if hasattr(model, 'support_'):
        metrics['num_support_vectors'] = len(model.support_)
        metrics['support_vector_ratio'] = len(model.support_) / len(X_train)
        
        if problem_type == 'classification':
            metrics['support_vectors_per_class'] = {
                str(cls): int(count) for cls, count in 
                zip(model.classes_, model.n_support_)
            }
    
    # Feature importance for linear kernel
    if default_params.get('kernel') == 'linear' and hasattr(model, 'coef_'):
        if problem_type == 'classification':
            if len(model.classes_) == 2:
                coefficients = model.coef_[0]
            else:
                coefficients = np.mean(np.abs(model.coef_), axis=0)
        else:
            coefficients = model.coef_
        
        feature_importance = dict(zip(features, np.abs(coefficients)))
        total_importance = sum(feature_importance.values())
        if total_importance > 0:
            feature_importance = {k: v/total_importance for k, v in feature_importance.items()}
            metrics['feature_importance'] = dict(sorted(feature_importance.items(), 
                                                       key=lambda x: x[1], reverse=True))
    
    # Add kernel information
    metrics['kernel_used'] = default_params.get('kernel', 'rbf')
    
    # Add performance summary
    metrics['performance_summary'] = get_model_performance_summary(metrics, problem_type)
    
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
        'name': 'Support Vector Machine',
        'type': 'supervised',
        'task': 'both',  # Can handle both classification and regression
        'description': 'SVM finds the optimal hyperplane that separates classes or predicts continuous values by maximizing the margin.',
        'hyperparameters': {
            'C': {
                'type': 'float',
                'default': 1.0,
                'range': [0.01, 1000],
                'description': 'Regularization parameter (higher C = less regularization)'
            },
            'kernel': {
                'type': 'string',
                'default': 'rbf',
                'options': ['linear', 'poly', 'rbf', 'sigmoid'],
                'description': 'Kernel type to be used'
            },
            'gamma': {
                'type': 'string_or_float',
                'default': 'scale',
                'options': ['scale', 'auto'],
                'range': [0.001, 10],
                'description': 'Kernel coefficient for rbf, poly and sigmoid'
            },
            'degree': {
                'type': 'integer',
                'default': 3,
                'range': [2, 10],
                'description': 'Degree of the polynomial kernel'
            },
            'epsilon': {
                'type': 'float',
                'default': 0.1,
                'range': [0.01, 1.0],
                'description': 'Epsilon parameter for SVR (regression only)'
            }
        },
        'pros': [
            'Effective in high-dimensional spaces',
            'Memory efficient (uses support vectors)',
            'Versatile with different kernel functions',
            'Works well with clear margin separation',
            'Robust to overfitting in high dimensions'
        ],
        'cons': [
            'Slow on large datasets',
            'Sensitive to feature scaling',
            'No probabilistic output (without probability=True)',
            'Difficult to interpret',
            'Sensitive to noise and overlapping classes'
        ],
        'use_cases': [
            'Text classification',
            'Image classification',
            'Gene classification',
            'High-dimensional data',
            'When training data is limited'
        ]
    }
