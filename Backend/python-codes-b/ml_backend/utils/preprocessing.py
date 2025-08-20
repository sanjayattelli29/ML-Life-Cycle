import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.impute import SimpleImputer

def preprocess_data(df, features, target=None, preprocessing_steps=None):
    """
    Preprocess the dataset with common preprocessing steps
    
    Args:
        df: Input DataFrame
        features: List of feature columns
        target: Target column name (optional)
        preprocessing_steps: Dict of preprocessing options
    
    Returns:
        Processed DataFrame, feature encoders, target encoder
    """
    if preprocessing_steps is None:
        preprocessing_steps = {
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': False,
            'remove_outliers': False
        }
    
    processed_df = df.copy()
    feature_encoders = {}
    target_encoder = None
    
    # Handle missing values
    if preprocessing_steps.get('handle_missing', True):
        # Numeric columns - fill with median
        numeric_cols = processed_df[features].select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            imputer_numeric = SimpleImputer(strategy='median')
            processed_df[numeric_cols] = imputer_numeric.fit_transform(processed_df[numeric_cols])
        
        # Categorical columns - fill with mode
        categorical_cols = processed_df[features].select_dtypes(exclude=[np.number]).columns
        if len(categorical_cols) > 0:
            imputer_categorical = SimpleImputer(strategy='most_frequent')
            processed_df[categorical_cols] = imputer_categorical.fit_transform(processed_df[categorical_cols])
    
    # Encode categorical variables
    if preprocessing_steps.get('encode_categorical', True):
        categorical_cols = processed_df[features].select_dtypes(exclude=[np.number]).columns
        
        for col in categorical_cols:
            if col in features:
                le = LabelEncoder()
                processed_df[col] = le.fit_transform(processed_df[col].astype(str))
                feature_encoders[col] = le
    
    # Encode target if it's categorical
    if target and target in processed_df.columns:
        if processed_df[target].dtype == 'object' or processed_df[target].nunique() <= 20:
            target_encoder = LabelEncoder()
            processed_df[target] = target_encoder.fit_transform(processed_df[target].astype(str))
    
    # Scale features
    if preprocessing_steps.get('scale_features', False):
        scaler = StandardScaler()
        processed_df[features] = scaler.fit_transform(processed_df[features])
        feature_encoders['scaler'] = scaler
    
    # Remove outliers using IQR method
    if preprocessing_steps.get('remove_outliers', False):
        numeric_features = [f for f in features if processed_df[f].dtype in [np.int64, np.float64]]
        
        for feature in numeric_features:
            Q1 = processed_df[feature].quantile(0.25)
            Q3 = processed_df[feature].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            processed_df = processed_df[
                (processed_df[feature] >= lower_bound) & 
                (processed_df[feature] <= upper_bound)
            ]
    
    return processed_df, feature_encoders, target_encoder

def detect_problem_type(target_series):
    """
    Automatically detect if the problem is classification or regression
    
    Args:
        target_series: Target column as pandas Series
    
    Returns:
        'classification' or 'regression'
    """
    # If target is string/object type, it's classification
    if target_series.dtype == 'object':
        return 'classification'
    
    # If target has <= 10 unique values and is integer, likely classification
    unique_values = target_series.nunique()
    if unique_values <= 10 and target_series.dtype in [np.int64, np.int32]:
        return 'classification'
    
    # If target is continuous (float) or has many unique values, it's regression
    return 'regression'

def split_features_target(df, features, target):
    """
    Split dataframe into features and target
    
    Args:
        df: Input DataFrame
        features: List of feature column names
        target: Target column name
    
    Returns:
        X (features), y (target)
    """
    X = df[features].copy()
    y = df[target].copy() if target else None
    
    return X, y

def get_feature_importance(model, feature_names):
    """
    Extract feature importance from trained model
    
    Args:
        model: Trained sklearn model
        feature_names: List of feature names
    
    Returns:
        Dictionary of feature importances
    """
    importance_dict = {}
    
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        importance_dict = dict(zip(feature_names, importances))
    elif hasattr(model, 'coef_'):
        # For linear models, use absolute coefficients
        coefficients = np.abs(model.coef_).flatten()
        importance_dict = dict(zip(feature_names, coefficients))
    
    # Sort by importance (descending)
    importance_dict = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))
    
    return importance_dict
