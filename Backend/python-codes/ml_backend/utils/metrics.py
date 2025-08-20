import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score, adjusted_rand_score, davies_bouldin_score
)
import pandas as pd

def calculate_classification_metrics(y_true, y_pred, y_proba=None):
    """
    Calculate comprehensive classification metrics
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        y_proba: Predicted probabilities (optional)
    
    Returns:
        Dictionary of metrics
    """
    metrics = {}
    
    # Basic metrics
    metrics['accuracy'] = float(accuracy_score(y_true, y_pred))
    metrics['precision'] = float(precision_score(y_true, y_pred, average='weighted', zero_division=0))
    metrics['recall'] = float(recall_score(y_true, y_pred, average='weighted', zero_division=0))
    metrics['f1_score'] = float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    metrics['confusion_matrix'] = cm.tolist()
    
    # ROC AUC for binary classification
    if len(np.unique(y_true)) == 2 and y_proba is not None:
        if y_proba.ndim > 1:
            y_proba = y_proba[:, 1]  # Take positive class probabilities
        metrics['roc_auc'] = float(roc_auc_score(y_true, y_proba))
    
    # Class-wise metrics
    try:
        report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        metrics['class_report'] = report
    except:
        pass
    
    return metrics

def calculate_regression_metrics(y_true, y_pred):
    """
    Calculate comprehensive regression metrics
    
    Args:
        y_true: True values
        y_pred: Predicted values
    
    Returns:
        Dictionary of metrics
    """
    metrics = {}
    
    # Basic metrics
    metrics['r2_score'] = float(r2_score(y_true, y_pred))
    metrics['mean_squared_error'] = float(mean_squared_error(y_true, y_pred))
    metrics['root_mean_squared_error'] = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    metrics['mean_absolute_error'] = float(mean_absolute_error(y_true, y_pred))
    
    # Additional metrics
    metrics['mean_absolute_percentage_error'] = float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100)
    
    # Residual statistics
    residuals = y_true - y_pred
    metrics['residuals'] = {
        'mean': float(np.mean(residuals)),
        'std': float(np.std(residuals)),
        'min': float(np.min(residuals)),
        'max': float(np.max(residuals))
    }
    
    return metrics

def calculate_clustering_metrics(X, labels, true_labels=None):
    """
    Calculate clustering metrics
    
    Args:
        X: Feature matrix
        labels: Cluster labels
        true_labels: True labels if available (optional)
    
    Returns:
        Dictionary of metrics
    """
    metrics = {}
    
    # Internal metrics (don't require true labels)
    if len(np.unique(labels)) > 1:  # Need at least 2 clusters
        metrics['silhouette_score'] = float(silhouette_score(X, labels))
        metrics['davies_bouldin_score'] = float(davies_bouldin_score(X, labels))
    
    # External metrics (require true labels)
    if true_labels is not None:
        metrics['adjusted_rand_score'] = float(adjusted_rand_score(true_labels, labels))
    
    # Cluster statistics
    unique_labels = np.unique(labels)
    metrics['num_clusters'] = len(unique_labels)
    metrics['cluster_sizes'] = {str(label): int(np.sum(labels == label)) for label in unique_labels}
    
    return metrics

def calculate_anomaly_detection_metrics(y_true, y_pred, anomaly_scores=None):
    """
    Calculate anomaly detection metrics
    
    Args:
        y_true: True labels (1 for normal, -1 for anomaly)
        y_pred: Predicted labels (1 for normal, -1 for anomaly)
        anomaly_scores: Anomaly scores (optional)
    
    Returns:
        Dictionary of metrics
    """
    metrics = {}
    
    # Convert to binary (0 for normal, 1 for anomaly)
    y_true_binary = (y_true == -1).astype(int)
    y_pred_binary = (y_pred == -1).astype(int)
    
    # Basic classification metrics
    metrics['accuracy'] = float(accuracy_score(y_true_binary, y_pred_binary))
    metrics['precision'] = float(precision_score(y_true_binary, y_pred_binary, zero_division=0))
    metrics['recall'] = float(recall_score(y_true_binary, y_pred_binary, zero_division=0))
    metrics['f1_score'] = float(f1_score(y_true_binary, y_pred_binary, zero_division=0))
    
    # Confusion matrix
    cm = confusion_matrix(y_true_binary, y_pred_binary)
    metrics['confusion_matrix'] = cm.tolist()
    
    # Anomaly-specific metrics
    total_samples = len(y_true)
    predicted_anomalies = np.sum(y_pred_binary)
    actual_anomalies = np.sum(y_true_binary)
    
    metrics['anomaly_rate'] = {
        'predicted': float(predicted_anomalies / total_samples),
        'actual': float(actual_anomalies / total_samples)
    }
    
    return metrics

def get_model_performance_summary(metrics, model_type):
    """
    Generate a human-readable performance summary
    
    Args:
        metrics: Dictionary of calculated metrics
        model_type: Type of model ('classification', 'regression', 'clustering', 'anomaly_detection')
    
    Returns:
        Dictionary with performance summary
    """
    summary = {'model_type': model_type}
    
    if model_type == 'classification':
        accuracy = metrics.get('accuracy', 0)
        f1 = metrics.get('f1_score', 0)
        
        if accuracy >= 0.9:
            performance = 'Excellent'
        elif accuracy >= 0.8:
            performance = 'Good'
        elif accuracy >= 0.7:
            performance = 'Fair'
        else:
            performance = 'Poor'
        
        summary['overall_performance'] = performance
        summary['key_metrics'] = {
            'accuracy': f"{accuracy:.3f}",
            'f1_score': f"{f1:.3f}"
        }
        
    elif model_type == 'regression':
        r2 = metrics.get('r2_score', 0)
        rmse = metrics.get('root_mean_squared_error', float('inf'))
        
        if r2 >= 0.9:
            performance = 'Excellent'
        elif r2 >= 0.7:
            performance = 'Good'
        elif r2 >= 0.5:
            performance = 'Fair'
        else:
            performance = 'Poor'
        
        summary['overall_performance'] = performance
        summary['key_metrics'] = {
            'r2_score': f"{r2:.3f}",
            'rmse': f"{rmse:.3f}"
        }
        
    elif model_type == 'clustering':
        silhouette = metrics.get('silhouette_score', 0)
        
        if silhouette >= 0.7:
            performance = 'Excellent'
        elif silhouette >= 0.5:
            performance = 'Good'
        elif silhouette >= 0.3:
            performance = 'Fair'
        else:
            performance = 'Poor'
        
        summary['overall_performance'] = performance
        summary['key_metrics'] = {
            'silhouette_score': f"{silhouette:.3f}",
            'num_clusters': metrics.get('num_clusters', 0)
        }
        
    elif model_type == 'anomaly_detection':
        f1 = metrics.get('f1_score', 0)
        precision = metrics.get('precision', 0)
        
        if f1 >= 0.8:
            performance = 'Excellent'
        elif f1 >= 0.6:
            performance = 'Good'
        elif f1 >= 0.4:
            performance = 'Fair'
        else:
            performance = 'Poor'
        
        summary['overall_performance'] = performance
        summary['key_metrics'] = {
            'f1_score': f"{f1:.3f}",
            'precision': f"{precision:.3f}"
        }
    
    return summary
