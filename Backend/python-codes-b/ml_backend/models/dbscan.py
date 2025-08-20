from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from utils.metrics import calculate_clustering_metrics, get_model_performance_summary
from utils.preprocessing import preprocess_data

def train_model(dataframe, features, hyperparams=None):
    """
    Train a DBSCAN clustering model
    
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
        'eps': 0.5,
        'min_samples': 5,
        'metric': 'euclidean',
        'algorithm': 'auto',
        'leaf_size': 30,
        'p': None,
        'n_jobs': None
    }
    
    # Update with provided hyperparameters
    default_params.update(hyperparams)
    
    # Preprocess data
    processed_df, feature_encoders, _ = preprocess_data(
        dataframe, features, target=None,
        preprocessing_steps={
            'handle_missing': True,
            'encode_categorical': True,
            'scale_features': True,  # DBSCAN benefits from scaling
            'remove_outliers': False
        }
    )
    
    # Prepare features
    X = processed_df[features]
    
    # Auto-determine eps if not specified
    if 'eps' not in hyperparams:
        optimal_eps = estimate_optimal_eps(X, k=default_params['min_samples'])
        default_params['eps'] = optimal_eps
    
    # Train the model
    model = DBSCAN(**default_params)
    cluster_labels = model.fit_predict(X)
    
    # Calculate metrics (exclude noise points for some metrics)
    valid_mask = cluster_labels != -1
    if np.sum(valid_mask) > 1:  # Need at least 2 non-noise points
        metrics = calculate_clustering_metrics(X[valid_mask], cluster_labels[valid_mask])
    else:
        metrics = {'error': 'All points classified as noise'}
    
    # Add model-specific information
    metrics['model_type'] = 'dbscan'
    metrics['hyperparameters'] = default_params
    metrics['feature_count'] = len(features)
    metrics['total_samples'] = len(X)
    
    # Add DBSCAN-specific metrics
    unique_labels = np.unique(cluster_labels)
    n_clusters = len(unique_labels) - (1 if -1 in unique_labels else 0)
    n_noise = np.sum(cluster_labels == -1)
    
    metrics['num_clusters'] = n_clusters
    metrics['num_noise_points'] = int(n_noise)
    metrics['noise_ratio'] = float(n_noise / len(X))
    metrics['cluster_labels_unique'] = unique_labels.tolist()
    
    # Calculate cluster statistics
    cluster_stats = {}
    for label in unique_labels:
        if label == -1:
            # Noise points
            cluster_stats['noise'] = {
                'size': int(np.sum(cluster_labels == -1)),
                'percentage': float(np.sum(cluster_labels == -1) / len(X) * 100)
            }
        else:
            # Regular clusters
            cluster_mask = cluster_labels == label
            cluster_data = X[cluster_mask]
            
            cluster_stats[f'cluster_{label}'] = {
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
    
    # Add cluster assignments to dataframe (first 100 samples for preview)
    sample_size = min(100, len(X))
    cluster_preview = pd.DataFrame({
        'sample_index': range(sample_size),
        'cluster': cluster_labels[:sample_size].tolist(),
        'is_noise': (cluster_labels[:sample_size] == -1).tolist()
    })
    
    # Add original feature values for preview
    for feature in features[:5]:  # Limit to first 5 features
        cluster_preview[feature] = X[feature].iloc[:sample_size].tolist()
    
    metrics['cluster_preview'] = cluster_preview.to_dict(orient='records')
    
    # Calculate cluster density (average distance to k-th nearest neighbor)
    if n_clusters > 0:
        from sklearn.neighbors import NearestNeighbors
        k = min(default_params['min_samples'], len(X) - 1)
        
        if k > 0:
            nbrs = NearestNeighbors(n_neighbors=k+1).fit(X)  # +1 because point is its own neighbor
            distances, _ = nbrs.kneighbors(X)
            
            cluster_densities = {}
            for label in unique_labels:
                if label != -1:
                    cluster_mask = cluster_labels == label
                    cluster_distances = distances[cluster_mask, 1:]  # Exclude self
                    if len(cluster_distances) > 0:
                        avg_density = float(np.mean(cluster_distances))
                        cluster_densities[f'cluster_{label}'] = avg_density
            
            metrics['cluster_densities'] = cluster_densities
    
    # Add performance summary
    if 'error' not in metrics:
        metrics['performance_summary'] = get_model_performance_summary(metrics, 'clustering')
    else:
        metrics['performance_summary'] = {
            'model_type': 'clustering',
            'overall_performance': 'Failed',
            'key_metrics': {'error': metrics['error']}
        }
    
    # Store preprocessing information
    metrics['preprocessing'] = {
        'feature_encoders': feature_encoders is not None,
        'scaled_features': True
    }
    
    return model, metrics

def estimate_optimal_eps(X, k=5):
    """
    Estimate optimal eps parameter using k-distance graph
    
    Args:
        X: Feature matrix
        k: Number of nearest neighbors to consider
    
    Returns:
        Estimated optimal eps value
    """
    try:
        from sklearn.neighbors import NearestNeighbors
        
        k = min(k, len(X) - 1)
        if k <= 0:
            return 0.5
        
        # Calculate k-distance
        nbrs = NearestNeighbors(n_neighbors=k+1).fit(X)
        distances, _ = nbrs.kneighbors(X)
        
        # Sort k-distances in descending order
        k_distances = np.sort(distances[:, k])[::-1]
        
        # Find the elbow point (knee point)
        if len(k_distances) >= 3:
            # Simple elbow detection using gradient
            gradients = np.gradient(k_distances)
            elbow_point = np.argmax(gradients)
            optimal_eps = k_distances[elbow_point]
            
            # Ensure reasonable bounds
            optimal_eps = max(0.1, min(optimal_eps, 2.0))
            return float(optimal_eps)
        
    except Exception:
        pass
    
    return 0.5  # Default fallback

def get_model_info():
    """
    Get information about this model
    
    Returns:
        Dictionary with model information
    """
    return {
        'name': 'DBSCAN',
        'type': 'unsupervised',
        'task': 'clustering',
        'description': 'DBSCAN groups together points that are closely packed while marking points in low-density regions as outliers.',
        'hyperparameters': {
            'eps': {
                'type': 'float',
                'default': 0.5,
                'range': [0.1, 5.0],
                'description': 'Maximum distance between two samples for them to be considered neighbors'
            },
            'min_samples': {
                'type': 'integer',
                'default': 5,
                'range': [2, 20],
                'description': 'Minimum number of samples in a neighborhood for a point to be core'
            },
            'metric': {
                'type': 'string',
                'default': 'euclidean',
                'options': ['euclidean', 'manhattan', 'cosine', 'minkowski'],
                'description': 'Distance metric to use'
            },
            'algorithm': {
                'type': 'string',
                'default': 'auto',
                'options': ['auto', 'ball_tree', 'kd_tree', 'brute'],
                'description': 'Algorithm used to compute the nearest neighbors'
            }
        },
        'pros': [
            'Does not require specifying number of clusters',
            'Can find arbitrarily shaped clusters',
            'Robust to outliers (marks them as noise)',
            'Can discover clusters of varying densities',
            'Good for detecting anomalies'
        ],
        'cons': [
            'Sensitive to hyperparameters (eps, min_samples)',
            'Struggles with varying densities',
            'Can be sensitive to distance metric choice',
            'Memory intensive for large datasets',
            'Difficult to use with high-dimensional data'
        ],
        'use_cases': [
            'Anomaly detection',
            'Image processing',
            'Geolocation data clustering',
            'Fraud detection',
            'Density-based pattern discovery'
        ]
    }
