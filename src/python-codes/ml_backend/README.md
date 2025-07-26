# ML Backend - Modular Machine Learning System

A comprehensive Flask-based backend system for training, evaluating, and deploying machine learning models with support for supervised, unsupervised, and anomaly detection algorithms.

## 🚀 Features

- **Multiple ML Algorithms**: 8 different models covering classification, regression, clustering, and anomaly detection
- **Auto-Detection**: Automatically detects problem type (classification vs regression)
- **Comprehensive Metrics**: Detailed performance metrics for each model type
- **Data Preprocessing**: Built-in data cleaning, encoding, and scaling
- **Feature Importance**: Automatic feature importance calculation
- **Cloud Storage**: Cloudflare R2 integration for model storage
- **RESTful API**: Clean REST API with CORS support
- **Modular Design**: Easy to add new models and extend functionality

## 📁 Project Structure

```
ml_backend/
├── app.py                      # Main Flask application
├── requirements.txt            # Python dependencies
├── utils/
│   ├── preprocessing.py        # Data preprocessing utilities
│   ├── metrics.py             # Model evaluation metrics
│   └── save_to_cloudflare.py  # Cloud storage integration
├── models/
│   ├── linear_regression.py   # Linear regression model
│   ├── logistic_regression.py # Logistic regression model
│   ├── random_forest.py       # Random forest (classification/regression)
│   ├── svm.py                 # Support Vector Machine
│   ├── xgboost_model.py       # XGBoost (classification/regression)
│   ├── kmeans.py              # K-Means clustering
│   ├── dbscan.py              # DBSCAN clustering
│   └── isolation_forest.py    # Isolation Forest (anomaly detection)
└── saved_models/              # Local model storage
```

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   cd ml_backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables** (optional, for Cloudflare R2):
   ```bash
   export CLOUDFLARE_R2_ACCESS_KEY="your_access_key"
   export CLOUDFLARE_R2_SECRET_KEY="your_secret_key"
   export CLOUDFLARE_R2_ENDPOINT="your_r2_endpoint"
   export CLOUDFLARE_R2_BUCKET_NAME="your_bucket_name"
   export CLOUDFLARE_R2_PUBLIC_DOMAIN="your_public_domain"
   ```

4. **Run the Flask application**:
   ```bash
   python app.py
   ```

The API will be available at `http://localhost:5000`

## 📚 API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the API.

### Get Available Models
```
GET /models
```
Returns a list of all available models organized by type.

### Train Model
```
POST /train
```

**Request Body**:
```json
{
  "csv_url": "https://your.domain.com/dataset.csv",
  "features": ["feature1", "feature2", "feature3"],
  "target": "target_column",
  "test_size": 0.2,
  "model_name": "random_forest",
  "hyperparams": {
    "n_estimators": 100,
    "max_depth": 5
  }
}
```

**Response**:
```json
{
  "model_id": "uuid-string",
  "metrics": {
    "accuracy": 0.95,
    "precision": 0.94,
    "recall": 0.93,
    "f1_score": 0.935,
    "feature_importance": {...},
    "performance_summary": {...}
  },
  "model_name": "random_forest",
  "created_at": "2024-01-15T10:30:00",
  "preview": [...]
}
```

### Make Predictions
```
POST /predict
```

**Request Body**:
```json
{
  "model_id": "uuid-string",
  "data": [[1.2, 3.4, 5.6]]
}
```

### Save Model to Cloud
```
POST /save
```

**Request Body**:
```json
{
  "model_id": "uuid-string"
}
```

### Get Model Information
```
GET /models/<model_id>
```

### Delete Model
```
DELETE /models/<model_id>
```

## 🧠 Supported Models

### Supervised Learning

| Model | Task | Key Features |
|-------|------|-------------|
| Linear Regression | Regression | Fast, interpretable, baseline model |
| Logistic Regression | Classification | Probabilistic output, regularization |
| Random Forest | Both | Feature importance, handles mixed data |
| SVM | Both | Effective in high dimensions, kernel trick |
| XGBoost | Both | State-of-the-art performance, early stopping |

### Unsupervised Learning

| Model | Task | Key Features |
|-------|------|-------------|
| K-Means | Clustering | Simple, scalable, spherical clusters |
| DBSCAN | Clustering | Arbitrary shapes, outlier detection |

### Anomaly Detection

| Model | Task | Key Features |
|-------|------|-------------|
| Isolation Forest | Anomaly Detection | Efficient, no labeled data needed |

## 🔧 Model Configuration

Each model accepts specific hyperparameters. Use the model info endpoints or check individual model files for detailed parameter descriptions.

### Example Hyperparameters

**Random Forest**:
```json
{
  "n_estimators": 100,
  "max_depth": 10,
  "min_samples_split": 2,
  "max_features": "sqrt"
}
```

**XGBoost**:
```json
{
  "n_estimators": 100,
  "learning_rate": 0.1,
  "max_depth": 6,
  "subsample": 0.8
}
```

**K-Means**:
```json
{
  "n_clusters": 3,
  "init": "k-means++",
  "max_iter": 300
}
```

## 📊 Data Requirements

### Input Format
- **CSV files** accessible via URL
- **Features**: Numerical or categorical columns
- **Target**: Single column for supervised learning (optional for unsupervised)

### Data Preprocessing
The system automatically handles:
- ✅ Missing values (median for numerical, mode for categorical)
- ✅ Categorical encoding (Label encoding)
- ✅ Feature scaling (when beneficial for the model)
- ✅ Outlier detection (optional)

## 🌐 Cloud Integration

### Cloudflare R2 Setup
1. Create a Cloudflare R2 bucket
2. Generate API credentials
3. Set environment variables
4. Models and metadata are automatically uploaded

### Local Fallback
If cloud storage is not configured, models are saved locally in the `saved_models/` directory.

## 🧪 Testing the API

### Using curl

**Train a model**:
```bash
curl -X POST http://localhost:5000/train \
  -H "Content-Type: application/json" \
  -d '{
    "csv_url": "https://your.domain.com/data.csv",
    "features": ["feature1", "feature2"],
    "target": "target",
    "model_name": "random_forest"
  }'
```

**Get model info**:
```bash
curl http://localhost:5000/models/<model_id>
```

### Using Python

```python
import requests

# Train a model
response = requests.post('http://localhost:5000/train', json={
    'csv_url': 'https://your.domain.com/data.csv',
    'features': ['feature1', 'feature2', 'feature3'],
    'target': 'target_column',
    'model_name': 'xgboost_model',
    'hyperparams': {'n_estimators': 200, 'learning_rate': 0.05}
})

result = response.json()
model_id = result['model_id']

# Make predictions
predictions = requests.post('http://localhost:5000/predict', json={
    'model_id': model_id,
    'data': [[1.2, 3.4, 5.6]]
})
```

## 🔍 Metrics and Evaluation

### Classification Metrics
- Accuracy, Precision, Recall, F1-Score
- ROC AUC (binary classification)
- Confusion Matrix
- Class-wise performance report

### Regression Metrics
- R² Score, MSE, RMSE, MAE
- Mean Absolute Percentage Error
- Residual statistics

### Clustering Metrics
- Silhouette Score
- Davies-Bouldin Score
- Cluster statistics and characteristics

### Anomaly Detection Metrics
- Precision, Recall, F1-Score for anomaly detection
- Anomaly detection rate
- Score distributions

## 🚧 Adding New Models

1. **Create model file** in `models/` directory
2. **Implement required functions**:
   ```python
   def train_model(dataframe, features, target=None, test_size=0.2, hyperparams=None):
       # Model training logic
       return model, metrics, X_test, y_test, y_pred
   
   def get_model_info():
       # Model metadata
       return {...}
   ```
3. **Update app.py** if needed for new model types

## 🐛 Troubleshooting

### Common Issues

**Import Errors**:
- Ensure all dependencies are installed: `pip install -r requirements.txt`

**Memory Issues**:
- Reduce dataset size or adjust model parameters
- Use sampling for large datasets

**Cloud Upload Fails**:
- Check Cloudflare R2 credentials
- Verify bucket permissions
- Models will fallback to local storage

**Model Training Fails**:
- Check data format and feature/target columns
- Verify hyperparameter ranges
- Review error logs for specific issues

## 📈 Performance Tips

1. **Feature Selection**: Use models with feature importance to select relevant features
2. **Hyperparameter Tuning**: Start with default parameters, then optimize key parameters
3. **Data Quality**: Clean and preprocess data before training
4. **Model Selection**: Try multiple models and compare performance
5. **Cross-Validation**: Use multiple train-test splits for robust evaluation

## 🔮 Future Enhancements

- [ ] Hyperparameter optimization (GridSearch, RandomSearch)
- [ ] Cross-validation support
- [ ] Model ensembling
- [ ] Deep learning models (PyTorch/TensorFlow)
- [ ] Model versioning and A/B testing
- [ ] Real-time prediction API
- [ ] Model interpretability tools (SHAP, LIME)
- [ ] Automated feature engineering
- [ ] Model monitoring and drift detection

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

**Happy Machine Learning! 🚀**
