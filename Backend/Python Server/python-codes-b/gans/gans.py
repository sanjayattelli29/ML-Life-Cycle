import os
import json
import traceback
import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
import warnings
import multiprocessing
warnings.filterwarnings('ignore')

# Fix for Windows multiprocessing issues with CTGAN - must be at module level
if os.name == 'nt':  # Windows
    multiprocessing.set_start_method('spawn', force=True)

import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Data processing
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from scipy.stats import ks_2samp, chi2_contingency
from scipy.spatial.distance import jensenshannon

# GAN libraries - Updated for SDV 1.21.0+
try:
    from sdv.single_table import CTGANSynthesizer, GaussianCopulaSynthesizer, CopulaGANSynthesizer
    from sdv.metadata import SingleTableMetadata
    from sdmetrics.reports.single_table import QualityReport
    SDV_AVAILABLE = True
except ImportError:
    SDV_AVAILABLE = False
    print("Warning: SDV library not installed. Install with: pip install sdv sdmetrics")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Custom JSON encoder to handle numpy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        elif hasattr(obj, 'item'):
            return obj.item()
        return super().default(obj)

# Configure Flask to use the custom encoder
app.json_encoder = NumpyEncoder

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'datasets'
SYNTHETIC_FOLDER = 'synthetic'
REPORTS_FOLDER = 'reports'

# Create necessary directories
for folder in [UPLOAD_FOLDER, SYNTHETIC_FOLDER, REPORTS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

class DatasetAnalyzer:
    """Comprehensive dataset analysis and preprocessing"""
    
    def __init__(self):
        self.label_encoders = {}
        self.scalers = {}
        
    def analyze_dataset(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze dataset structure and characteristics"""
        try:
            analysis = {
                'timestamp': datetime.now().isoformat(),
                'shape': [int(df.shape[0]), int(df.shape[1])],
                'columns': list(df.columns),
                'dtypes': {str(k): str(v) for k, v in df.dtypes.astype(str).to_dict().items()},
                'missing_values': {str(k): int(v) for k, v in df.isnull().sum().to_dict().items()},
                'memory_usage_mb': float(df.memory_usage(deep=True).sum() / 1024**2),
                'duplicates': int(df.duplicated().sum()),
                'column_analysis': {}
            }
            
            for col in df.columns:
                col_analysis = {
                    'dtype': str(df[col].dtype),
                    'unique_count': int(df[col].nunique()),
                    'null_count': int(df[col].isnull().sum()),
                    'null_percentage': float((df[col].isnull().sum() / len(df)) * 100)
                }
                
                try:
                    if df[col].dtype in ['int64', 'float64']:
                        col_analysis.update({
                            'mean': float(df[col].mean()) if not df[col].isnull().all() else 0.0,
                            'std': float(df[col].std()) if not df[col].isnull().all() else 0.0,
                            'min': float(df[col].min()) if not df[col].isnull().all() else 0.0,
                            'max': float(df[col].max()) if not df[col].isnull().all() else 0.0,
                            'quartiles': {str(k): float(v) for k, v in df[col].quantile([0.25, 0.5, 0.75]).to_dict().items()} if not df[col].isnull().all() else {}
                        })
                    else:
                        # For categorical/text data
                        top_values = df[col].value_counts().head(10).to_dict()
                        col_analysis.update({
                            'top_values': {str(k): int(v) for k, v in top_values.items()},
                            'is_categorical': df[col].nunique() / len(df) < 0.05  # Heuristic for categorical
                        })
                except Exception as col_error:
                    logger.error(f"Error analyzing column {col}: {str(col_error)}")
                    col_analysis['error'] = str(col_error)
                
                analysis['column_analysis'][col] = col_analysis
                
            analysis['success'] = True
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing dataset: {str(e)}")
            return {'error': f"Dataset analysis failed: {str(e)}"}

    def preprocess_dataset(self, df: pd.DataFrame, target_column: str = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Preprocess dataset for GAN training"""
        preprocessing_report = {
            'timestamp': datetime.now().isoformat(),
            'steps_performed': [],
            'original_shape': [int(df.shape[0]), int(df.shape[1])],
            'target_column': target_column,
            'encoders_used': {},
            'scalers_used': {},
            'warnings': []
        }
        
        try:
            processed_df = df.copy()
            
            # Step 1: Handle missing values
            if processed_df.isnull().sum().sum() > 0:
                numeric_cols = processed_df.select_dtypes(include=[np.number]).columns
                categorical_cols = processed_df.select_dtypes(include=['object']).columns
                
                # Fill numeric missing values with median
                for col in numeric_cols:
                    if processed_df[col].isnull().sum() > 0:
                        median_val = processed_df[col].median()
                        processed_df[col].fillna(median_val, inplace=True)
                        preprocessing_report['steps_performed'].append(f"Filled missing values in {col} with median: {median_val}")
                
                # Fill categorical missing values with mode
                for col in categorical_cols:
                    if processed_df[col].isnull().sum() > 0:
                        mode_val = processed_df[col].mode().iloc[0] if not processed_df[col].mode().empty else 'unknown'
                        processed_df[col].fillna(mode_val, inplace=True)
                        preprocessing_report['steps_performed'].append(f"Filled missing values in {col} with mode: {mode_val}")
            
            # Step 2: Encode categorical variables
            categorical_columns = processed_df.select_dtypes(include=['object']).columns
            for col in categorical_columns:
                if col != target_column:  # Don't encode target if it's categorical
                    le = LabelEncoder()
                    processed_df[col] = le.fit_transform(processed_df[col].astype(str))
                    self.label_encoders[col] = le
                    preprocessing_report['encoders_used'][col] = list(le.classes_)
                    preprocessing_report['steps_performed'].append(f"Label encoded column: {col}")
            
            # Step 3: Handle target column separately if it's categorical
            if target_column and target_column in categorical_columns:
                le_target = LabelEncoder()
                processed_df[target_column] = le_target.fit_transform(processed_df[target_column].astype(str))
                self.label_encoders[target_column] = le_target
                preprocessing_report['encoders_used'][target_column] = list(le_target.classes_)
                preprocessing_report['steps_performed'].append(f"Label encoded target column: {target_column}")
            
            # Step 4: Scale numerical features (optional, some GANs handle this internally)
            numeric_columns = processed_df.select_dtypes(include=[np.number]).columns
            if len(numeric_columns) > 0:
                scaler = MinMaxScaler()
                processed_df[numeric_columns] = scaler.fit_transform(processed_df[numeric_columns])
                self.scalers['numeric'] = scaler
                preprocessing_report['scalers_used']['numeric'] = list(numeric_columns)
                preprocessing_report['steps_performed'].append(f"MinMax scaled numeric columns: {list(numeric_columns)}")
            
            preprocessing_report['final_shape'] = [int(processed_df.shape[0]), int(processed_df.shape[1])]
            preprocessing_report['success'] = True
            
            return processed_df, preprocessing_report
            
        except Exception as e:
            preprocessing_report['error'] = str(e)
            preprocessing_report['success'] = False
            logger.error(f"Preprocessing error: {str(e)}")
            return df, preprocessing_report

class GANGenerator:
    """GAN-based synthetic data generation with multiple model support"""
    
    def __init__(self):
        self.models = {}
        self.available_models = []
        
        if SDV_AVAILABLE:
            self.available_models = ['CTGAN', 'GaussianCopula', 'CopulaGAN']
        else:
            raise ImportError("SDV library is required. Install with: pip install sdv")
    
    def generate_synthetic_data(self, df: pd.DataFrame, model_type: str = 'CTGAN', 
                              sample_size: int = None, target_column: str = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Generate synthetic data using specified GAN model"""
        
        generation_report = {
            'timestamp': datetime.now().isoformat(),
            'model_type': model_type,
            'original_shape': [int(df.shape[0]), int(df.shape[1])],
            'target_column': target_column,
            'sample_size_requested': sample_size or len(df),
            'training_time_seconds': 0,
            'generation_time_seconds': 0,
            'success': False,
            'warnings': [],
            'model_parameters': {}
        }
        
        try:
            start_time = datetime.now()
            
            # Create metadata for the dataset (required in SDV 1.21.0+)
            metadata = SingleTableMetadata()
            metadata.detect_from_dataframe(df)
            
            # Initialize model based on type - Updated for SDV 1.21.0+
            if model_type == 'CTGAN':
                # Ultra-minimal settings for Windows stability - use tiny network
                dataset_size = len(df)
                if dataset_size > 5000:
                    # For large datasets, use extremely conservative settings
                    model = CTGANSynthesizer(
                        metadata=metadata,
                        epochs=20,  # Minimal epochs for large datasets
                        batch_size=64,  # Very small batch size
                        generator_dim=(32, 32),  # Tiny network
                        discriminator_dim=(32, 32),  # Tiny network
                        generator_lr=5e-3,  # Higher learning rate for faster convergence
                        discriminator_lr=5e-3,
                        cuda=False,
                        verbose=True,
                        pac=1  # Reduce PAC for stability
                    )
                    generation_report['model_parameters']['optimization'] = 'ultra_minimal_for_large_dataset'
                else:
                    # For smaller datasets, slightly more epochs but still conservative
                    model = CTGANSynthesizer(
                        metadata=metadata,
                        epochs=50,
                        batch_size=128,
                        generator_dim=(64, 64),
                        discriminator_dim=(64, 64),
                        cuda=False,
                        verbose=True
                    )
                    generation_report['model_parameters']['optimization'] = 'minimal_for_small_dataset'
                
                generation_report['model_parameters']['epochs'] = model.epochs
                generation_report['model_parameters']['batch_size'] = model.batch_size
            elif model_type == 'GaussianCopula':
                model = GaussianCopulaSynthesizer(
                    metadata=metadata
                )
            elif model_type == 'CopulaGAN':
                model = CopulaGANSynthesizer(
                    metadata=metadata,
                    epochs=100,  # Reduced for faster training
                    batch_size=min(250, len(df) // 8),  # Smaller batch size
                    verbose=False,
                    cuda=False  # Disable CUDA
                )
            else:
                raise ValueError(f"Unsupported model type: {model_type}")
            
            # Train the model - Updated for SDV 1.21.0+ with timeout protection
            logger.info(f"Training {model_type} model...")
            try:
                if model_type == 'CTGAN':
                    # Add special handling for CTGAN with progress monitoring
                    logger.info("Starting CTGAN training with enhanced monitoring...")
                    
                    # For Windows, implement a simple timeout check
                    import time
                    start_fit_time = time.time()
                    max_training_time = 600  # 10 minutes max for CTGAN
                    
                    # Try fitting with monitoring
                    model.fit(df)
                    
                    fit_duration = time.time() - start_fit_time
                    if fit_duration > max_training_time:
                        raise TimeoutError(f"CTGAN training exceeded {max_training_time} seconds")
                    
                    logger.info(f"CTGAN training completed in {fit_duration:.2f} seconds")
                else:
                    # Other models (GaussianCopula, CopulaGAN) are usually faster
                    model.fit(df)
                    
            except Exception as fit_error:
                logger.error(f"Model training failed: {str(fit_error)}")
                
                # Fallback mechanism: if CTGAN fails, try GaussianCopula
                if model_type == 'CTGAN':
                    logger.info("CTGAN failed, falling back to GaussianCopula...")
                    generation_report['warnings'].append('CTGAN_training_failed_fallback_to_gaussian_copula')
                    
                    model = GaussianCopulaSynthesizer(metadata=metadata)
                    model.fit(df)
                    generation_report['model_type'] = 'GaussianCopula_fallback'
                    logger.info("Successfully fell back to GaussianCopula")
                else:
                    # If other models fail, raise the error
                    raise fit_error
            training_end = datetime.now()
            generation_report['training_time_seconds'] = (training_end - start_time).total_seconds()
            
            # Generate synthetic data
            logger.info("Generating synthetic data...")
            sample_size = sample_size or len(df)
            
            # Handle class balancing if target column is specified
            if target_column and target_column in df.columns:
                # Check if target is binary/categorical for balancing
                unique_targets = df[target_column].unique()
                if len(unique_targets) <= 10:  # Assume categorical if <= 10 unique values
                    # Generate balanced samples
                    samples_per_class = sample_size // len(unique_targets)
                    synthetic_dfs = []
                    
                    for target_val in unique_targets:
                        try:
                            # This is a simplified approach - SDV doesn't directly support conditional sampling
                            # Generate extra samples and filter
                            temp_samples = model.sample(samples_per_class * 3)
                            filtered_samples = temp_samples[temp_samples[target_column].round() == target_val]
                            if len(filtered_samples) >= samples_per_class:
                                synthetic_dfs.append(filtered_samples.head(samples_per_class))
                            else:
                                synthetic_dfs.append(filtered_samples)
                        except:
                            # Fallback to regular sampling
                            synthetic_dfs.append(model.sample(samples_per_class))
                    
                    synthetic_data = pd.concat(synthetic_dfs, ignore_index=True)
                    generation_report['balancing_attempted'] = True
                else:
                    synthetic_data = model.sample(sample_size)
                    generation_report['balancing_attempted'] = False
            else:
                synthetic_data = model.sample(sample_size)
                generation_report['balancing_attempted'] = False
            
            generation_end = datetime.now()
            generation_report['generation_time_seconds'] = (generation_end - training_end).total_seconds()
            generation_report['final_shape'] = [int(synthetic_data.shape[0]), int(synthetic_data.shape[1])]
            generation_report['success'] = True
            
            # Store model for potential reuse
            self.models[model_type] = model
            
            return synthetic_data, generation_report
            
        except Exception as e:
            generation_report['error'] = str(e)
            logger.error(f"GAN generation error: {str(e)}")
            return pd.DataFrame(), generation_report

class SyntheticDataEvaluator:
    """Comprehensive evaluation of synthetic data quality"""
    
    def evaluate_synthetic_data(self, original_df: pd.DataFrame, synthetic_df: pd.DataFrame, 
                               target_column: str = None) -> Dict[str, Any]:
        """Comprehensive evaluation of synthetic data quality"""
        
        evaluation_report = {
            'timestamp': datetime.now().isoformat(),
            'original_shape': [int(original_df.shape[0]), int(original_df.shape[1])],
            'synthetic_shape': [int(synthetic_df.shape[0]), int(synthetic_df.shape[1])],
            'target_column': target_column,
            'statistical_similarity': {},
            'distribution_similarity': {},
            'correlation_similarity': {},
            'privacy_metrics': {},
            'utility_metrics': {},
            'overall_score': 0,
            'warnings': []
        }
        
        try:
            # 1. Statistical Similarity (KS Test for numerical columns)
            numeric_cols = original_df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if col in synthetic_df.columns:
                    try:
                        ks_stat, p_value = ks_2samp(original_df[col], synthetic_df[col])
                        evaluation_report['statistical_similarity'][col] = {
                            'ks_statistic': float(ks_stat),
                            'p_value': float(p_value),
                            'similarity_score': float(1 - ks_stat)  # Higher is better
                        }
                    except Exception as e:
                        logger.error(f"KS test failed for {col}: {str(e)}")
                        evaluation_report['statistical_similarity'][col] = {
                            'ks_statistic': 0.0,
                            'p_value': 1.0,
                            'similarity_score': 0.0,
                            'error': str(e)
                        }
                        evaluation_report['warnings'].append(f"KS test failed for {col}: {str(e)}")
            
            # 2. Distribution Similarity (Jensen-Shannon Divergence)
            for col in original_df.columns:
                if col in synthetic_df.columns:
                    try:
                        # Create histograms
                        if original_df[col].dtype in ['int64', 'float64']:
                            orig_hist, bins = np.histogram(original_df[col], bins=20, density=True)
                            synt_hist, _ = np.histogram(synthetic_df[col], bins=bins, density=True)
                        else:
                            # For categorical data
                            orig_counts = original_df[col].value_counts(normalize=True)
                            synt_counts = synthetic_df[col].value_counts(normalize=True)
                            
                            # Align indices
                            all_values = set(orig_counts.index) | set(synt_counts.index)
                            orig_hist = np.array([orig_counts.get(val, 0) for val in all_values])
                            synt_hist = np.array([synt_counts.get(val, 0) for val in all_values])
                        
                        # Calculate Jensen-Shannon divergence
                        orig_hist = orig_hist + 1e-8  # Add small epsilon to avoid log(0)
                        synt_hist = synt_hist + 1e-8
                        orig_hist = orig_hist / orig_hist.sum()
                        synt_hist = synt_hist / synt_hist.sum()
                        
                        js_div = jensenshannon(orig_hist, synt_hist)
                        evaluation_report['distribution_similarity'][col] = {
                            'jensen_shannon_divergence': float(js_div),
                            'similarity_score': float(1 - js_div)  # Higher is better
                        }
                    except Exception as e:
                        logger.error(f"Distribution similarity failed for {col}: {str(e)}")
                        evaluation_report['distribution_similarity'][col] = {
                            'jensen_shannon_divergence': 1.0,
                            'similarity_score': 0.0,
                            'error': str(e)
                        }
                        evaluation_report['warnings'].append(f"Distribution similarity failed for {col}: {str(e)}")
            
            # 3. Correlation Similarity
            try:
                orig_corr = original_df.select_dtypes(include=[np.number]).corr()
                synt_corr = synthetic_df.select_dtypes(include=[np.number]).corr()
                
                # Calculate correlation between correlation matrices
                common_cols = orig_corr.columns.intersection(synt_corr.columns)
                if len(common_cols) > 1:
                    orig_corr_vals = orig_corr.loc[common_cols, common_cols].values.flatten()
                    synt_corr_vals = synt_corr.loc[common_cols, common_cols].values.flatten()
                    
                    corr_similarity = np.corrcoef(orig_corr_vals, synt_corr_vals)[0, 1]
                    evaluation_report['correlation_similarity'] = {
                        'correlation_coefficient': float(corr_similarity) if not np.isnan(corr_similarity) else 0,
                        'similarity_score': float(abs(corr_similarity)) if not np.isnan(corr_similarity) else 0
                    }
            except Exception as e:
                logger.error(f"Correlation similarity failed: {str(e)}")
                evaluation_report['correlation_similarity'] = {
                    'correlation_coefficient': 0.0,
                    'similarity_score': 0.0,
                    'error': str(e)
                }
                evaluation_report['warnings'].append(f"Correlation similarity failed: {str(e)}")
            
            # 4. Privacy Metrics (Distance to Closest Record)
            try:
                # Simple privacy metric: minimum distance to original data
                from sklearn.metrics.pairwise import euclidean_distances
                
                numeric_orig = original_df.select_dtypes(include=[np.number])
                numeric_synt = synthetic_df.select_dtypes(include=[np.number])
                
                if len(numeric_orig.columns) > 0 and len(numeric_synt.columns) > 0:
                    common_cols = numeric_orig.columns.intersection(numeric_synt.columns)
                    if len(common_cols) > 0:
                        orig_subset = numeric_orig[common_cols].head(1000)  # Limit for performance
                        synt_subset = numeric_synt[common_cols].head(1000)
                        
                        distances = euclidean_distances(synt_subset, orig_subset)
                        min_distances = distances.min(axis=1)
                        
                        evaluation_report['privacy_metrics'] = {
                            'mean_min_distance': float(min_distances.mean()),
                            'std_min_distance': float(min_distances.std()),
                            'privacy_score': float(min_distances.mean())  # Higher is better for privacy
                        }
            except Exception as e:
                logger.error(f"Privacy metrics failed: {str(e)}")
                evaluation_report['privacy_metrics'] = {
                    'mean_min_distance': 0.0,
                    'std_min_distance': 0.0,
                    'privacy_score': 0.0,
                    'error': str(e)
                }
                evaluation_report['warnings'].append(f"Privacy metrics failed: {str(e)}")
            
            # 5. Utility Metrics (Train on Synthetic, Test on Real)
            if target_column and target_column in original_df.columns and target_column in synthetic_df.columns:
                try:
                    # Prepare data
                    orig_X = original_df.drop(columns=[target_column])
                    orig_y = original_df[target_column]
                    synt_X = synthetic_df.drop(columns=[target_column])
                    synt_y = synthetic_df[target_column]
                    
                    # Split original data for testing
                    X_train_orig, X_test_orig, y_train_orig, y_test_orig = train_test_split(
                        orig_X, orig_y, test_size=0.2, random_state=42
                    )
                    
                    # Train on synthetic, test on real
                    model = RandomForestClassifier(n_estimators=50, random_state=42)
                    model.fit(synt_X, synt_y)
                    
                    # Evaluate on original test set
                    y_pred = model.predict(X_test_orig)
                    accuracy = accuracy_score(y_test_orig, y_pred)
                    
                    # Train on original for comparison
                    model_orig = RandomForestClassifier(n_estimators=50, random_state=42)
                    model_orig.fit(X_train_orig, y_train_orig)
                    y_pred_orig = model_orig.predict(X_test_orig)
                    accuracy_orig = accuracy_score(y_test_orig, y_pred_orig)
                    
                    evaluation_report['utility_metrics'] = {
                        'tstr_accuracy': float(accuracy),  # Train on Synthetic, Test on Real
                        'trtr_accuracy': float(accuracy_orig),  # Train on Real, Test on Real
                        'utility_ratio': float(accuracy / accuracy_orig) if accuracy_orig > 0 else 0,
                        'utility_score': float(accuracy)
                    }
                except Exception as e:
                    logger.error(f"Utility metrics failed: {str(e)}")
                    evaluation_report['utility_metrics'] = {
                        'tstr_accuracy': 0.0,
                        'trtr_accuracy': 0.0,
                        'utility_ratio': 0.0,
                        'utility_score': 0.0,
                        'error': str(e)
                    }
                    evaluation_report['warnings'].append(f"Utility metrics failed: {str(e)}")
            
            # Calculate overall score
            scores = []
            
            # Statistical similarity score
            if evaluation_report['statistical_similarity']:
                stat_scores = [v['similarity_score'] for v in evaluation_report['statistical_similarity'].values()]
                scores.append(np.mean(stat_scores))
            
            # Distribution similarity score
            if evaluation_report['distribution_similarity']:
                dist_scores = [v['similarity_score'] for v in evaluation_report['distribution_similarity'].values()]
                scores.append(np.mean(dist_scores))
            
            # Correlation similarity score
            if evaluation_report['correlation_similarity']:
                scores.append(evaluation_report['correlation_similarity']['similarity_score'])
            
            # Utility score
            if evaluation_report['utility_metrics']:
                scores.append(evaluation_report['utility_metrics']['utility_score'])
            
            evaluation_report['overall_score'] = float(np.mean(scores)) if scores else 0
            evaluation_report['success'] = True
            
            return evaluation_report
            
        except Exception as e:
            evaluation_report['error'] = str(e)
            logger.error(f"Evaluation error: {str(e)}")
            return evaluation_report

# Initialize components
analyzer = DatasetAnalyzer()
generator = None  # Initialize lazily to avoid import errors during module load
evaluator = SyntheticDataEvaluator()

def get_generator():
    """Lazy initialization of GAN generator"""
    global generator
    if generator is None:
        generator = GANGenerator()
    return generator

@app.route('/')
def home():
    return jsonify({
        "message": "GAN Synthetic Data Generator API",
        "version": "1.0.0",
        "available_endpoints": {
            "upload": "POST /upload",
            "datasets": "GET /datasets",
            "analyze": "POST /analyze",
            "generate": "POST /generate",
            "download": "GET /download/<filename>",
            "report": "GET /report/<filename>"
        },
        "available_models": get_generator().available_models if SDV_AVAILABLE else ["SDV library not available"]
    })

@app.route('/upload', methods=['POST'])
def upload_dataset():
    """Upload and validate dataset"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            
            # Try to read and validate the file
            try:
                if filename.endswith('.csv'):
                    df = pd.read_csv(filepath)
                elif filename.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(filepath)
                else:
                    return jsonify({'error': 'Unsupported file format. Please use CSV or Excel files.'}), 400
                
                # Basic validation
                if df.empty:
                    return jsonify({'error': 'Uploaded file is empty'}), 400
                
                if len(df) < 10:
                    return jsonify({'error': 'Dataset too small. Minimum 10 rows required.'}), 400
                
                return jsonify({
                    'message': 'File uploaded successfully',
                    'filename': filename,
                    'shape': [int(df.shape[0]), int(df.shape[1])],
                    'columns': list(df.columns),
                    'preview': df.head().to_dict('records')
                }), 200
                
            except Exception as e:
                os.remove(filepath)  # Clean up invalid file
                return jsonify({'error': f'Invalid file format or corrupted data: {str(e)}'}), 400
    
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/datasets', methods=['GET'])
def list_datasets():
    """List all uploaded datasets"""
    try:
        datasets = []
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith(('.csv', '.xlsx', '.xls')):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                try:
                    if filename.endswith('.csv'):
                        df = pd.read_csv(filepath)
                    else:
                        df = pd.read_excel(filepath)
                    
                    datasets.append({
                        'filename': filename,
                        'shape': [int(df.shape[0]), int(df.shape[1])],
                        'size_mb': round(os.path.getsize(filepath) / 1024**2, 2),
                        'columns': list(df.columns)
                    })
                except:
                    continue
        
        return jsonify({'datasets': datasets}), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to list datasets: {str(e)}'}), 500

@app.route('/analyze', methods=['POST'])
def analyze_dataset():
    """Analyze dataset structure and characteristics"""
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
        
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'Dataset not found'}), 404
        
        # Load dataset
        if filename.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
        
        # Analyze dataset
        analysis = analyzer.analyze_dataset(df)
        
        # Save analysis report
        report_filename = f"{filename}_analysis.json"
        report_path = os.path.join(REPORTS_FOLDER, report_filename)
        with open(report_path, 'w') as f:
            json.dump(analysis, f, indent=2, default=str)
        
        return jsonify({
            'analysis': analysis,
            'report_saved': report_filename
        }), 200
    
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/generate', methods=['POST'])
def generate_synthetic_data():
    """Generate synthetic data using GAN"""
    try:
        data = request.json
        filename = data.get('filename')
        model_type = data.get('model_type', 'CTGAN')
        sample_size = data.get('sample_size')
        target_column = data.get('target_column')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
        
        if not SDV_AVAILABLE:
            return jsonify({'error': 'SDV library not available. Please install SDV.'}), 500
        
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'Dataset not found'}), 404
        
        # Load dataset
        if filename.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)
        
        # Complete processing pipeline
        full_report = {
            'timestamp': datetime.now().isoformat(),
            'filename': filename,
            'model_type': model_type,
            'target_column': target_column,
            'steps': {}
        }
        
        # Step 1: Dataset Analysis
        logger.info("Step 1: Analyzing dataset...")
        analysis = analyzer.analyze_dataset(df)
        full_report['steps']['1_analysis'] = analysis
        
        # Step 2: Preprocessing
        logger.info("Step 2: Preprocessing dataset...")
        processed_df, preprocessing_report = analyzer.preprocess_dataset(df, target_column)
        full_report['steps']['2_preprocessing'] = preprocessing_report
        
        if not preprocessing_report.get('success', False):
            return jsonify({
                'error': 'Preprocessing failed',
                'report': full_report
            }), 400
        
        # Step 3: GAN Training and Generation
        logger.info(f"Step 3: Generating synthetic data using {model_type}...")
        synthetic_df, generation_report = get_generator().generate_synthetic_data(
            processed_df, model_type, sample_size, target_column
        )
        full_report['steps']['3_generation'] = generation_report
        
        if not generation_report.get('success', False):
            return jsonify({
                'error': 'Generation failed',
                'report': full_report
            }), 400
        
        # Step 4: Evaluation
        logger.info("Step 4: Evaluating synthetic data quality...")
        evaluation_report = evaluator.evaluate_synthetic_data(processed_df, synthetic_df, target_column)
        full_report['steps']['4_evaluation'] = evaluation_report
        
        # Step 5: Save Results
        logger.info("Step 5: Saving results...")
        base_name = os.path.splitext(filename)[0]
        synthetic_filename = f"{base_name}_synthetic_{model_type.lower()}.csv"
        synthetic_path = os.path.join(SYNTHETIC_FOLDER, synthetic_filename)
        synthetic_df.to_csv(synthetic_path, index=False)
        
        report_filename = f"{base_name}_full_report_{model_type.lower()}.json"
        report_path = os.path.join(REPORTS_FOLDER, report_filename)
        
        full_report['steps']['5_saving'] = {
            'synthetic_filename': synthetic_filename,
            'report_filename': report_filename,
            'synthetic_path': synthetic_path,
            'report_path': report_path,
            'success': True
        }
        
        # Save full report
        with open(report_path, 'w') as f:
            json.dump(full_report, f, indent=2, default=str)
        
        return jsonify({
            'message': 'Synthetic data generated successfully',
            'synthetic_filename': synthetic_filename,
            'report_filename': report_filename,
            'summary': {
                'original_shape': [int(df.shape[0]), int(df.shape[1])],
                'synthetic_shape': [int(synthetic_df.shape[0]), int(synthetic_df.shape[1])],
                'overall_quality_score': evaluation_report.get('overall_score', 0),
                'processing_time_seconds': sum([
                    generation_report.get('training_time_seconds', 0),
                    generation_report.get('generation_time_seconds', 0)
                ])
            },
            'full_report': full_report
        }), 200
    
    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': f'Generation failed: {str(e)}',
            'traceback': traceback.format_exc()
        }), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download synthetic dataset or report"""
    try:
        # Check in synthetic folder first
        synthetic_path = os.path.join(SYNTHETIC_FOLDER, filename)
        if os.path.exists(synthetic_path):
            return send_file(synthetic_path, as_attachment=True)
        
        # Check in reports folder
        report_path = os.path.join(REPORTS_FOLDER, filename)
        if os.path.exists(report_path):
            return send_file(report_path, as_attachment=True)
        
        # Check in datasets folder
        dataset_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(dataset_path):
            return send_file(dataset_path, as_attachment=True)
        
        return jsonify({'error': 'File not found'}), 404
    
    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

@app.route('/report/<filename>')
def get_report(filename):
    """Get detailed report as JSON"""
    try:
        report_path = os.path.join(REPORTS_FOLDER, filename)
        if not os.path.exists(report_path):
            return jsonify({'error': 'Report not found'}), 404
        
        with open(report_path, 'r') as f:
            report = json.load(f)
        
        return jsonify(report), 200
    
    except Exception as e:
        return jsonify({'error': f'Failed to load report: {str(e)}'}), 500

@app.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available GAN models"""
    return jsonify({
        'available_models': get_generator().available_models if SDV_AVAILABLE else [],
        'sdv_available': SDV_AVAILABLE,
        'model_descriptions': {
            'CTGAN': 'Conditional Tabular GAN - Best for mixed data types with categorical features',
            'GaussianCopula': 'Gaussian Copula model - Good for continuous data',
            'CopulaGAN': 'Copula-based GAN - Hybrid approach combining copulas and GANs'
        } if SDV_AVAILABLE else {}
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'sdv_available': SDV_AVAILABLE,
        'upload_folder_exists': os.path.exists(UPLOAD_FOLDER),
        'synthetic_folder_exists': os.path.exists(SYNTHETIC_FOLDER),
        'reports_folder_exists': os.path.exists(REPORTS_FOLDER)
    })

@app.route('/cleanup', methods=['POST'])
def cleanup_files():
    """Clean up old files (optional utility endpoint)"""
    try:
        data = request.json
        days_old = data.get('days_old', 7)  # Default: files older than 7 days
        
        import time
        current_time = time.time()
        cutoff_time = current_time - (days_old * 24 * 60 * 60)
        
        cleaned_files = []
        
        for folder in [UPLOAD_FOLDER, SYNTHETIC_FOLDER, REPORTS_FOLDER]:
            for filename in os.listdir(folder):
                filepath = os.path.join(folder, filename)
                if os.path.isfile(filepath):
                    file_time = os.path.getctime(filepath)
                    if file_time < cutoff_time:
                        os.remove(filepath)
                        cleaned_files.append(filename)
        
        return jsonify({
            'message': f'Cleaned {len(cleaned_files)} files older than {days_old} days',
            'cleaned_files': cleaned_files
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Cleanup failed: {str(e)}'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🚀 Starting GAN Synthetic Data Generator API...")
    print(f"📊 SDV Library Available: {SDV_AVAILABLE}")
    if SDV_AVAILABLE:
        print(f"🤖 Available Models: {', '.join(get_generator().available_models)}")
    else:
        print("⚠️  Warning: SDV library not available. Please install with: pip install sdv")
    
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"🔬 Synthetic folder: {SYNTHETIC_FOLDER}")
    print(f"📋 Reports folder: {REPORTS_FOLDER}")
    print("🌐 Starting server on http://localhost:4321")
    print("\n📖 API Endpoints:")
    print("  POST /upload          - Upload dataset")
    print("  GET  /datasets        - List uploaded datasets") 
    print("  POST /analyze         - Analyze dataset")
    print("  POST /generate        - Generate synthetic data")
    print("  GET  /download/<file> - Download file")
    print("  GET  /report/<file>   - Get detailed report")
    print("  GET  /models          - List available models")
    print("  GET  /health          - Health check")
    print("  POST /cleanup         - Clean old files")
    
    # Use a safer Flask configuration for multiprocessing
    app.run(host='0.0.0.0', port=4321, debug=False, threaded=True, use_reloader=False)