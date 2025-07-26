# Backend ML Server Integration Guide

## Enhanced Training Configuration

The frontend now sends enhanced training configuration with automatic task type detection. Here's what the backend needs to handle:

## Request Format

The training request now includes:

```json
{
  "model_name": "random_forest",
  "test_size": 0.2,
  "validation_size": 0.1,
  "random_state": 42,
  "hyperparams": {
    "n_estimators": 100,
    "max_depth": 10,
    "task_type": "classification",
    "model_variant": "RandomForestClassifier"
  },
  "csv_data": "csv content...",
  "features": ["feature1", "feature2", "feature3"],
  "target": "target_column"
}
```

## Key Changes Required

### 1. Read Task Type Information

```python
# Extract task type information
task_type = config.get('hyperparams', {}).get('task_type', 'classification')
model_variant = config.get('hyperparams', {}).get('model_variant', 'RandomForestClassifier')
```

### 2. Import Correct Model Classes

```python
# Classification models
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from xgboost import XGBClassifier

# Regression models  
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.svm import SVR
from xgboost import XGBRegressor
```

### 3. Model Selection Logic

```python
# Model variant mapping
MODEL_CLASSES = {
    'RandomForestClassifier': RandomForestClassifier,
    'RandomForestRegressor': RandomForestRegressor,
    'XGBClassifier': XGBClassifier,
    'XGBRegressor': XGBRegressor,
    'LogisticRegression': LogisticRegression,
    'LinearRegression': LinearRegression,
    'SVC': SVC,
    'SVR': SVR
}

# Select the correct model class
ModelClass = MODEL_CLASSES.get(model_variant)
if not ModelClass:
    raise ValueError(f"Unsupported model variant: {model_variant}")
```

### 4. Metrics Selection

```python
# Return appropriate metrics based on task type
if task_type == 'classification':
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred, average='weighted'),
        'recall': recall_score(y_test, y_pred, average='weighted'),
        'f1': f1_score(y_test, y_pred, average='weighted')
    }
else:  # regression
    metrics = {
        'r2': r2_score(y_test, y_pred),
        'mse': mean_squared_error(y_test, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
        'mae': mean_absolute_error(y_test, y_pred)
    }
```

## Example Backend Implementation

```python
@app.route('/train', methods=['POST'])
def train_model():
    config = request.json
    
    # Extract task type information
    task_type = config.get('hyperparams', {}).get('task_type', 'classification')
    model_variant = config.get('hyperparams', {}).get('model_variant', 'RandomForestClassifier')
    
    # Remove task metadata from hyperparams before passing to model
    hyperparams = config.get('hyperparams', {}).copy()
    hyperparams.pop('task_type', None)
    hyperparams.pop('model_variant', None)
    
    # Select correct model class
    ModelClass = MODEL_CLASSES.get(model_variant)
    if not ModelClass:
        return jsonify({'error': f'Unsupported model variant: {model_variant}'}), 400
    
    # Create model instance with hyperparameters
    model = ModelClass(**hyperparams)
    
    # Train model...
    model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate appropriate metrics
    if task_type == 'classification':
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='weighted'),
            'recall': recall_score(y_test, y_pred, average='weighted'),
            'f1': f1_score(y_test, y_pred, average='weighted'),
            'task_type': 'classification'
        }
    else:
        metrics = {
            'r2': r2_score(y_test, y_pred),
            'mse': mean_squared_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred),
            'task_type': 'regression'
        }
    
    return jsonify({
        'success': True,
        'model_variant': model_variant,
        'task_type': task_type,
        'metrics': metrics,
        'feature_importance': model.feature_importances_.tolist() if hasattr(model, 'feature_importances_') else None
    })
```

## Testing the Integration

1. **Start your ML backend server** on `http://localhost:5000`
2. **Select a dataset** in the frontend
3. **Choose a target column** - the system will automatically detect if it's classification or regression
4. **Select any model** - the system will automatically choose the correct variant (e.g., RandomForestClassifier vs RandomForestRegressor)
5. **Click "Start Training"** - the enhanced config will be sent to your backend

The frontend will display a confidence indicator showing the task type detection accuracy and the selected model variant.
