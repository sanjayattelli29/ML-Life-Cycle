from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from utils.metrics import calculate_clustering_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data

def train_model(dataframe, features, hyperparams=None):
    """
    Train a K-Means clustering model
    
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
        'n_clusters': 3,
        'init': 'k-means++',
        'n_init': 10,
        'max_iter': 300,
        'tol': 1e-4,
        'random_state': 42,
        'algorithm': 'auto'
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Preprocess data
    processed_df, feature_encoders, _ = preprocess_data(
        dataframe, features, target=None,
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': True,  # K-means benefits from scaling
            'remove_outliers': False
        }
    )
    
    # Prepare features
    X = processed_df[features]
    
    # Auto-determine number of clusters if not specified
    if 'n_clusters' not in hyperparams:
        optimal_k = find_optimal_clusters(X, max_k=min(10, len(X)//2))
        default_params['n_clusters'] = optimal_k
    
    # Train the model
    model = KMeans(**default_params)
    cluster_labels = model.fit_predict(X)
    
    # Calculate metrics
    metrics = calculate_clustering_metrics(X, cluster_labels)
    
    # Add model-specific information
    metrics['model_type'] = 'kmeans'
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['total_samples'] = len(X)
    
    # Add K-means specific metrics
    metrics['inertia'] = float(model.inertia_)
    metrics['n_iter'] = int(model.n_iter_)
    
    # Add cluster centers
    if hasattr(model, 'cluster_centers_'):
        cluster_centers = {}
        for i, center in enumerate(model.cluster_centers_):
            cluster_centers[f'cluster_{i}'] = {
                feature: float(center[j]) for j, feature in enumerate(features)
            }
        metrics['cluster_centers'] = cluster_centers
    
    # Calculate within-cluster sum of squares for each cluster
    cluster_wcss = []
    for i in range(default_params['n_clusters']):
        cluster_points = X[cluster_labels == i]
        if len(cluster_points) > 0:
            center = model.cluster_centers_[i]
            wcss = np.sum((cluster_points - center) ** 2)
            cluster_wcss.append(float(wcss))
        else:
            cluster_wcss.append(0.0)
    
    metrics['cluster_wcss'] = cluster_wcss
    
    # Add cluster assignments to dataframe (first 100 samples for preview)
    sample_size = min(100, len(X))
    cluster_preview = pd.DataFrame({
        'sample_index': range(sample_size),
        'cluster': cluster_labels[:sample_size].tolist()
    })
    
    # Add original feature values for preview
    for feature in features[:5]:  # Limit to first 5 features to avoid large response
        cluster_preview[feature] = X[feature].iloc[:sample_size].tolist()
    
    metrics['cluster_preview'] = cluster_preview.to_dict(orient='records')
    
    # Calculate cluster characteristics
    cluster_stats = {}
    for i in range(default_params['n_clusters']):
        cluster_mask = cluster_labels == i
        cluster_data = X[cluster_mask]
        
        if len(cluster_data) > 0:
            cluster_stats[f'cluster_{i}'] = {
                'size': int(len(cluster_data)),
                'percentage': float(len(cluster_data) / len(X) * 100),
                'feature_means': {
                    feature: float(cluster_data[feature].mean()) 
                    for feature in features
                },
                'feature_stds': {
                    feature: float(cluster_data[feature].std()) 
                    for feature in features
                }
            }
    
    metrics['cluster_statistics'] = cluster_stats
    
    # Add performance summary
    metrics['performance_summary'] = get_model_performance_summary(metrics, 'clustering')
    
    # Store preprocessing information
    metrics['preprocessing'] = {
        'feature_encoders': feature_encoders is not None,
        'scaled_features': True
    }
    
    return model, metrics

def find_optimal_clusters(X, max_k=10, method='elbow'):
    """
    Find optimal number of clusters using elbow method
    
    Args:
        X: Feature matrix
        max_k: Maximum number of clusters to test
        method: Method to use ('elbow')
    
    Returns:
        Optimal number of clusters
    """
    if len(X) < 4:
        return 2
    
    max_k = min(max_k, len(X) - 1)
    inertias = []
    
    for k in range(1, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=5)
        kmeans.fit(X)
        inertias.append(kmeans.inertia_)
    
    # Find elbow using rate of change
    if len(inertias) >= 3:
        diffs = np.diff(inertias)
        diff_ratios = diffs[:-1] / diffs[1:]
        optimal_k = np.argmax(diff_ratios) + 2  # +2 because we start from k=1 and take diff
        return min(optimal_k, max_k)
    
    return 3  # Default fallback

def get_model_info():
    """
    Get information about this model
    
    Returns:
        Dictionary with model information
    """
    return {
        'name': 'K-Means Clustering',
        'type': 'unsupervised',
        'task': 'clustering',
        'description': 'K-Means partitions data into k clusters by minimizing within-cluster sum of squares.',
        'hyperparameters': {
            'n_clusters': {
                'type': 'integer',
                'default': 3,
                'range': [2, 20],
                'description': 'Number of clusters to form'
            },
            'init': {
                'type': 'string',
                'default': 'k-means++',
                'options': ['k-means++', 'random'],
                'description': 'Method for initialization'
            },
            'n_init': {
                'type': 'integer',
                'default': 10,
                'range': [5, 50],
                'description': 'Number of time the k-means algorithm will be run'
            },
            'max_iter': {
                'type': 'integer',
                'default': 300,
                'range': [100, 1000],
                'description': 'Maximum number of iterations'
            },
            'tol': {
                'type': 'float',
                'default': 1e-4,
                'range': [1e-6, 1e-2],
                'description': 'Tolerance for convergence'
            }
        },
        'pros': [
            'Simple and fast algorithm',
            'Works well with spherical clusters',
            'Scalable to large datasets',
            'Guaranteed convergence',
            'Easy to interpret results'
        ],
        'cons': [
            'Need to specify number of clusters',
            'Sensitive to initialization',
            'Assumes spherical clusters',
            'Sensitive to outliers and noise',
            'Struggles with varying cluster sizes'
        ],
        'use_cases': [
            'Customer segmentation',
            'Image segmentation',
            'Data compression',
            'Market research',
            'Preliminary data exploration'
        ]
    }
