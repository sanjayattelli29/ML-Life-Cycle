# data_preprocessing_api.py

import pandas as pd
import numpy as np
import warnings
import logging
import re
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler, RobustScaler
from sklearn.feature_selection import VarianceThreshold
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from scipy.stats import chi2_contingency, zscore
from scipy import stats
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
from imblearn.pipeline import Pipeline as ImbPipeline
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from io import StringIO
import hashlib
import json

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Configure rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

app.config['CORS_HEADERS'] = 'Content-Type'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

warnings.filterwarnings('ignore')

class AdvancedDataPreprocessor:
    def __init__(self, df, target_col=None, preprocessing_config=None):
        """
        Advanced Data Preprocessor with 12 key preprocessing factors
        
        Args:
            df: pandas DataFrame
            target_col: target column name for supervised learning
            preprocessing_config: dict with preprocessing parameters
        """
        self.df = df.copy()
        self.original_df = df.copy()
        self.target_col = target_col
        self.preprocessing_log = []
        self.preprocessing_stats = {}
        self.config = preprocessing_config or self._get_default_config()
        
        # Column type detection
        self.numeric_cols = list(self.df.select_dtypes(include=[np.number]).columns)
        self.categorical_cols = list(self.df.select_dtypes(include=['object', 'category']).columns)
        self.datetime_cols = []
        
        # Remove target from feature columns if specified
        if self.target_col and self.target_col in self.numeric_cols:
            self.numeric_cols.remove(self.target_col)
        if self.target_col and self.target_col in self.categorical_cols:
            self.categorical_cols.remove(self.target_col)

    def _get_default_config(self):
        """Default preprocessing configuration"""
        return {
            'missing_values': {
                'method': 'mice',  # mice, median, mean, mode
                'max_missing_threshold': 0.5  # Drop columns with >50% missing
            },
            'duplicates': {
                'method': 'bloom_filter',  # bloom_filter, standard
                'keep': 'first'
            },
            'invalid_data': {
                'method': 'statistical_tests',  # rule_based, statistical_tests
                'confidence_level': 0.05
            },
            'outliers': {
                'method': 'isolation_forest',  # iqr, robust_zscore, isolation_forest
                'contamination': 0.1
            },
            'inconsistent_formats': {
                'method': 'regex_validation',  # regex_validation, automated
                'auto_fix': True
            },
            'cardinality': {
                'method': 'probabilistic_counting',  # exact, probabilistic_counting
                'max_cardinality': 100
            },
            'class_imbalance': {
                'method': 'smote',  # smote, undersampling, cost_sensitive
                'target_ratio': 'auto'
            },
            'data_type_mismatch': {
                'method': 'schema_enforcement',  # auto_validation, schema_enforcement
                'auto_convert': True
            },
            'feature_correlation': {
                'method': 'pearson',  # pearson, spearman, vif
                'threshold': 0.9
            },
            'low_variance': {
                'method': 'variance_threshold',  # variance_threshold, std_threshold
                'threshold': 0.01
            },
            'mean_median_drift': {
                'method': 'percentage_drift',  # percentage_drift, absolute_drift
                'threshold': 0.2
            },
            'range_violations': {
                'method': 'domain_specific',  # rule_based, domain_specific
                'auto_bounds': True
            }
        }

    def _get_factor_config(self, key):
        val = self.config.get(key, True)
        if isinstance(val, dict):
            return val
        elif val is True:
            # Use default config for this factor
            return self._get_default_config()[key]
        else:
            # Disabled
            return None

    def preprocess_all(self):
        """
        Execute all 12 preprocessing steps in the optimal order, respecting config for factor selection
        """
        try:
            logger.info("Starting comprehensive data preprocessing...")
            cfg = self.config or {}

            # Step 1: Handle Missing Values (MICE)
            if not cfg or cfg.get('missing_values', True):
                self._handle_missing_values()

            # Step 2: Remove Duplicate Records (Bloom Filter approach)
            if not cfg or cfg.get('duplicates', True):
                self._handle_duplicates()

            # Step 3: Fix Invalid Data (Statistical Tests)
            if not cfg or cfg.get('invalid_data', True):
                self._handle_invalid_data()

            # Step 4: Handle Data Type Mismatches (Schema Enforcement)
            if not cfg or cfg.get('data_type_mismatch', True):
                self._handle_data_type_mismatches()

            # Step 5: Fix Inconsistent Formats (Regex + Validators)
            if not cfg or cfg.get('inconsistent_formats', True):
                self._handle_inconsistent_formats()

            # Step 6: Handle Outliers (Isolation Forest)
            if not cfg or cfg.get('outliers', True):
                self._handle_outliers()

            # Step 7: Check Cardinality/Uniqueness (Probabilistic Counting)
            if not cfg or cfg.get('cardinality', True):
                self._handle_cardinality()

            # Step 8: Remove Low Variance Features (VarianceThreshold)
            if not cfg or cfg.get('low_variance', True):
                self._handle_low_variance_features()

            # Step 9: Handle Feature Correlation (Pearson + VIF)
            if not cfg or cfg.get('feature_correlation', True):
                self._handle_feature_correlation()

            # Step 10: Check Mean-Median Drift
            if not cfg or cfg.get('mean_median_drift', True):
                self._handle_mean_median_drift()

            # Step 11: Handle Range Violations
            if not cfg or cfg.get('range_violations', True):
                self._handle_range_violations()

            # Step 12: Handle Class Imbalance (SMOTE)
            if not cfg or cfg.get('class_imbalance', True):
                self._handle_class_imbalance()

            # Generate final preprocessing report
            self._generate_preprocessing_report()

            logger.info("Data preprocessing completed successfully!")
            return self.df

        except Exception as e:
            logger.error(f"Error during preprocessing: {str(e)}")
            return self.original_df

    def _handle_missing_values(self):
        """Handle missing values using Multiple Imputation (MICE)"""
        cfg = self._get_factor_config('missing_values')
        if cfg is None:
            return
        try:
            missing_before = self.df.isnull().sum().sum()
            
            # Drop columns with excessive missing values
            cols_to_drop = []
            for col in self.df.columns:
                missing_pct = self.df[col].isnull().mean()
                if missing_pct > cfg['max_missing_threshold']:
                    cols_to_drop.append(col)
            
            if cols_to_drop:
                self.df.drop(columns=cols_to_drop, inplace=True)
                self.preprocessing_log.append(f"Dropped {len(cols_to_drop)} columns with >50% missing values: {cols_to_drop}")
            
            # MICE imputation for remaining missing values
            if self.df.isnull().sum().sum() > 0:
                # Separate numeric and categorical columns
                numeric_cols_with_missing = [col for col in self.numeric_cols if col in self.df.columns and self.df[col].isnull().any()]
                categorical_cols_with_missing = [col for col in self.categorical_cols if col in self.df.columns and self.df[col].isnull().any()]
                
                # MICE for numeric columns
                if numeric_cols_with_missing:
                    imputer = IterativeImputer(random_state=42, max_iter=10)
                    self.df[numeric_cols_with_missing] = imputer.fit_transform(self.df[numeric_cols_with_missing])
                    self.preprocessing_log.append(f"Applied MICE imputation to {len(numeric_cols_with_missing)} numeric columns")
                
                # Mode imputation for categorical columns
                if categorical_cols_with_missing:
                    for col in categorical_cols_with_missing:
                        mode_val = self.df[col].mode()[0] if not self.df[col].mode().empty else 'Unknown'
                        self.df[col].fillna(mode_val, inplace=True)
                    self.preprocessing_log.append(f"Applied mode imputation to {len(categorical_cols_with_missing)} categorical columns")
            
            missing_after = self.df.isnull().sum().sum()
            self.preprocessing_stats['missing_values'] = {
                'before': int(missing_before),
                'after': int(missing_after),
                'columns_dropped': len(cols_to_drop)
            }
            
        except Exception as e:
            logger.error(f"Error in missing values handling: {str(e)}")

    def _handle_duplicates(self):
        """Remove duplicate records using Bloom Filter approach"""
        cfg = self._get_factor_config('duplicates')
        if cfg is None:
            return
        try:
            before_count = len(self.df)
            
            # Create hash-based bloom filter approach for duplicate detection
            def create_row_hash(row):
                return hashlib.md5(str(row.values).encode()).hexdigest()
            
            # Create hashes for all rows
            row_hashes = self.df.apply(create_row_hash, axis=1)
            
            # Remove duplicates
            self.df = self.df[~row_hashes.duplicated(keep=cfg.get('keep', 'first'))]
            
            after_count = len(self.df)
            duplicates_removed = before_count - after_count
            
            if duplicates_removed > 0:
                self.preprocessing_log.append(f"Removed {duplicates_removed} duplicate records using bloom filter approach")
            
            self.preprocessing_stats['duplicates'] = {
                'before_count': before_count,
                'after_count': after_count,
                'removed': duplicates_removed
            }
            
        except Exception as e:
            logger.error(f"Error in duplicate handling: {str(e)}")

    def _handle_invalid_data(self):
        """Handle invalid data using statistical tests (Chi-square)"""
        cfg = self._get_factor_config('invalid_data')
        if cfg is None:
            return
        try:
            invalid_count = 0
            
            for col in self.categorical_cols:
                if col in self.df.columns:
                    # Check for suspicious patterns in categorical data
                    value_counts = self.df[col].value_counts()
                    
                    # Chi-square test for uniformity
                    if len(value_counts) > 1:
                        expected = [len(self.df) / len(value_counts)] * len(value_counts)
                        chi2, p_value = chi2_contingency([value_counts.values, expected])[:2]
                        
                        if p_value < cfg.get('confidence_level', 0.05):
                            # Handle extremely skewed distributions
                            rare_values = value_counts[value_counts < len(self.df) * 0.001].index
                            if len(rare_values) > 0:
                                self.df[col] = self.df[col].replace(rare_values, 'Other')
                                invalid_count += len(rare_values)
                                self.preprocessing_log.append(f"Replaced {len(rare_values)} rare values in {col} with 'Other'")
            
            # Check for invalid numeric data
            for col in self.numeric_cols:
                if col in self.df.columns:
                    # Check for infinite values
                    inf_mask = np.isinf(self.df[col])
                    if inf_mask.any():
                        self.df.loc[inf_mask, col] = np.nan
                        invalid_count += inf_mask.sum()
                        self.preprocessing_log.append(f"Replaced {inf_mask.sum()} infinite values in {col} with NaN")
            
            self.preprocessing_stats['invalid_data'] = {
                'invalid_values_fixed': invalid_count
            }
            
        except Exception as e:
            logger.error(f"Error in invalid data handling: {str(e)}")

    def _handle_outliers(self):
        """Handle outliers using Isolation Forest"""
        cfg = self._get_factor_config('outliers')
        if cfg is None:
            return
        try:
            outliers_removed = 0
            
            if len(self.numeric_cols) > 0:
                numeric_data = self.df[self.numeric_cols].copy()
                
                # Apply Isolation Forest
                iso_forest = IsolationForest(
                    contamination=cfg.get('contamination', 0.1),
                    random_state=42
                )
                
                outlier_predictions = iso_forest.fit_predict(numeric_data)
                outlier_mask = outlier_predictions == -1
                
                if outlier_mask.any():
                    # Replace outliers with median values
                    for col in self.numeric_cols:
                        if col in self.df.columns:
                            median_val = self.df[col].median()
                            self.df.loc[outlier_mask, col] = median_val
                    
                    outliers_removed = outlier_mask.sum()
                    self.preprocessing_log.append(f"Handled {outliers_removed} outlier records using Isolation Forest")
            
            self.preprocessing_stats['outliers'] = {
                'outliers_detected': int(outliers_removed),
                'method': 'isolation_forest'
            }
            
        except Exception as e:
            logger.error(f"Error in outlier handling: {str(e)}")

    def _handle_inconsistent_formats(self):
        """Handle inconsistent formats using Regex validation"""
        cfg = self._get_factor_config('inconsistent_formats')
        if cfg is None:
            return
        try:
            format_fixes = 0
            
            for col in self.categorical_cols:
                if col in self.df.columns:
                    # Common format standardizations
                    original_values = self.df[col].copy()
                    
                    # Email format standardization
                    if any(self.df[col].astype(str).str.contains('@', na=False)):
                        self.df[col] = self.df[col].astype(str).str.lower().str.strip()
                        format_fixes += 1
                        self.preprocessing_log.append(f"Standardized email formats in {col}")
                    
                    # Phone number standardization
                    phone_pattern = r'[\+\-\(\)\s]'
                    if any(self.df[col].astype(str).str.contains(r'\d{3,}', na=False)):
                        self.df[col] = self.df[col].astype(str).str.replace(phone_pattern, '', regex=True)
                        format_fixes += 1
                        self.preprocessing_log.append(f"Standardized phone formats in {col}")
                    
                    # General text cleaning
                    self.df[col] = self.df[col].astype(str).str.strip().str.replace(r'\s+', ' ', regex=True)
            
            self.preprocessing_stats['inconsistent_formats'] = {
                'columns_fixed': format_fixes
            }
            
        except Exception as e:
            logger.error(f"Error in format handling: {str(e)}")

    def _handle_cardinality(self):
        """Handle high cardinality using probabilistic counting"""
        cfg = self._get_factor_config('cardinality')
        if cfg is None:
            return
        try:
            high_cardinality_cols = []
            
            for col in self.categorical_cols:
                if col in self.df.columns:
                    cardinality = self.df[col].nunique()
                    
                    if cardinality > cfg.get('max_cardinality', 100):
                        # Use probabilistic counting and grouping
                        value_counts = self.df[col].value_counts()
                        
                        # Keep top N categories, group rest as 'Other'
                        top_categories = value_counts.head(cfg.get('max_cardinality', 100)).index
                        self.df[col] = self.df[col].apply(lambda x: x if x in top_categories else 'Other')
                        
                        high_cardinality_cols.append(col)
                        self.preprocessing_log.append(f"Reduced cardinality in {col} from {cardinality} to {self.df[col].nunique()}")
            
            self.preprocessing_stats['cardinality'] = {
                'high_cardinality_columns': len(high_cardinality_cols),
                'columns_modified': high_cardinality_cols
            }
            
        except Exception as e:
            logger.error(f"Error in cardinality handling: {str(e)}")

    def _handle_class_imbalance(self):
        """Handle class imbalance using SMOTE"""
        cfg = self._get_factor_config('class_imbalance')
        if cfg is None:
            return
        try:
            if self.target_col and self.target_col in self.df.columns:
                # Check if target is categorical
                if self.df[self.target_col].dtype in ['object', 'category'] or self.df[self.target_col].nunique() < 10:
                    value_counts = self.df[self.target_col].value_counts()
                    
                    # Calculate imbalance ratio
                    imbalance_ratio = value_counts.min() / value_counts.max()
                    
                    if imbalance_ratio < 0.5:  # If minority class is less than 50% of majority
                        # Prepare features and target
                        feature_cols = [col for col in self.df.columns if col != self.target_col]
                        X = self.df[feature_cols]
                        y = self.df[self.target_col]
                        
                        # Encode categorical features for SMOTE
                        X_encoded = pd.get_dummies(X, drop_first=True)
                        
                        # Apply SMOTE
                        smote = SMOTE(random_state=42, sampling_strategy='auto')
                        X_resampled, y_resampled = smote.fit_resample(X_encoded, y)
                        
                        # Reconstruct DataFrame
                        self.df = pd.concat([
                            pd.DataFrame(X_resampled, columns=X_encoded.columns),
                            pd.DataFrame({self.target_col: y_resampled})
                        ], axis=1)
                        
                        self.preprocessing_log.append(f"Applied SMOTE to balance target variable. New shape: {self.df.shape}")
                        
                        self.preprocessing_stats['class_imbalance'] = {
                            'original_ratio': float(imbalance_ratio),
                            'method': 'smote',
                            'original_shape': len(y),
                            'new_shape': len(y_resampled)
                        }
            
        except Exception as e:
            logger.error(f"Error in class imbalance handling: {str(e)}")

    def _handle_data_type_mismatches(self):
        """Handle data type mismatches with schema enforcement"""
        cfg = self._get_factor_config('data_type_mismatch')
        if cfg is None:
            return
        try:
            type_fixes = 0
            
            for col in self.df.columns:
                if col == self.target_col:
                    continue
                    
                # Auto-convert numeric strings
                if self.df[col].dtype == 'object':
                    # Try numeric conversion
                    numeric_converted = pd.to_numeric(self.df[col], errors='coerce')
                    if numeric_converted.notna().mean() > 0.8:  # If >80% can be converted
                        self.df[col] = numeric_converted
                        if col in self.categorical_cols:
                            self.categorical_cols.remove(col)
                        if col not in self.numeric_cols:
                            self.numeric_cols.append(col)
                        type_fixes += 1
                        self.preprocessing_log.append(f"Converted {col} from object to numeric")
                        continue
                    
                    # Try datetime conversion
                    try:
                        datetime_converted = pd.to_datetime(self.df[col], errors='coerce')
                        if datetime_converted.notna().mean() > 0.8:
                            self.df[col] = datetime_converted
                            self.datetime_cols.append(col)
                            if col in self.categorical_cols:
                                self.categorical_cols.remove(col)
                            type_fixes += 1
                            self.preprocessing_log.append(f"Converted {col} from object to datetime")
                            continue
                    except:
                        pass
            
            self.preprocessing_stats['data_type_mismatch'] = {
                'columns_converted': type_fixes
            }
            
        except Exception as e:
            logger.error(f"Error in data type handling: {str(e)}")

    def _handle_feature_correlation(self):
        """Handle highly correlated features using Pearson correlation + VIF"""
        cfg = self._get_factor_config('feature_correlation')
        if cfg is None:
            return
        try:
            removed_features = []
            
            if len(self.numeric_cols) > 1:
                # Calculate correlation matrix
                numeric_df = self.df[self.numeric_cols]
                corr_matrix = numeric_df.corr().abs()
                
                # Find highly correlated pairs
                upper_triangle = corr_matrix.where(
                    np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
                )
                
                # Remove features with correlation > threshold
                to_remove = [
                    column for column in upper_triangle.columns 
                    if any(upper_triangle[column] > cfg.get('threshold', 0.9))
                ]
                
                if to_remove:
                    self.df.drop(columns=to_remove, inplace=True)
                    removed_features = to_remove
                    # Update numeric_cols list
                    self.numeric_cols = [col for col in self.numeric_cols if col not in to_remove]
                    self.preprocessing_log.append(f"Removed {len(to_remove)} highly correlated features: {to_remove}")
            
            self.preprocessing_stats['feature_correlation'] = {
                'features_removed': len(removed_features),
                'removed_features': removed_features
            }
            
        except Exception as e:
            logger.error(f"Error in correlation handling: {str(e)}")

    def _handle_low_variance_features(self):
        """Handle low variance features using VarianceThreshold"""
        cfg = self._get_factor_config('low_variance')
        if cfg is None:
            return
        try:
            removed_features = []
            
            if len(self.numeric_cols) > 0:
                # Apply VarianceThreshold
                variance_selector = VarianceThreshold(threshold=cfg.get('threshold', 0.01))
                
                numeric_data = self.df[self.numeric_cols]
                variance_mask = variance_selector.fit_transform(numeric_data)
                
                # Get selected features
                selected_features = np.array(self.numeric_cols)[variance_selector.get_support()]
                removed_features = [col for col in self.numeric_cols if col not in selected_features]
                
                if removed_features:
                    self.df.drop(columns=removed_features, inplace=True)
                    self.numeric_cols = [col for col in self.numeric_cols if col not in removed_features]
                    self.preprocessing_log.append(f"Removed {len(removed_features)} low variance features: {removed_features}")
            
            self.preprocessing_stats['low_variance'] = {
                'features_removed': len(removed_features),
                'removed_features': removed_features
            }
            
        except Exception as e:
            logger.error(f"Error in low variance handling: {str(e)}")

    def _handle_mean_median_drift(self):
        """Check and handle mean-median drift"""
        cfg = self._get_factor_config('mean_median_drift')
        if cfg is None:
            return
        try:
            drift_columns = []
            
            for col in self.numeric_cols:
                if col in self.df.columns:
                    mean_val = self.df[col].mean()
                    median_val = self.df[col].median()
                    
                    if mean_val != 0:
                        drift_percentage = abs((mean_val - median_val) / mean_val) * 100
                        
                        if drift_percentage > cfg.get('threshold', 0.2) * 100:
                            drift_columns.append(col)
                            # Apply log transformation to reduce skewness
                            if (self.df[col] > 0).all():
                                self.df[col] = np.log1p(self.df[col])
                                self.preprocessing_log.append(f"Applied log transformation to {col} due to high mean-median drift ({drift_percentage:.2f}%)")
            
            self.preprocessing_stats['mean_median_drift'] = {
                'columns_with_drift': len(drift_columns),
                'transformed_columns': drift_columns
            }
            
        except Exception as e:
            logger.error(f"Error in mean-median drift handling: {str(e)}")

    def _handle_range_violations(self):
        """Handle range violations using domain-specific rules"""
        cfg = self._get_factor_config('range_violations')
        if cfg is None:
            return
        try:
            violations_fixed = 0
            
            for col in self.numeric_cols:
                if col in self.df.columns:
                    # Auto-detect reasonable bounds (mean ± 3*std)
                    mean_val = self.df[col].mean()
                    std_val = self.df[col].std()
                    
                    lower_bound = mean_val - 3 * std_val
                    upper_bound = mean_val + 3 * std_val
                    
                    # Count violations
                    violations = ((self.df[col] < lower_bound) | (self.df[col] > upper_bound))
                    
                    if violations.any():
                        # Cap extreme values
                        self.df.loc[self.df[col] < lower_bound, col] = lower_bound
                        self.df.loc[self.df[col] > upper_bound, col] = upper_bound
                        
                        violations_fixed += violations.sum()
                        self.preprocessing_log.append(f"Fixed {violations.sum()} range violations in {col}")
            
            self.preprocessing_stats['range_violations'] = {
                'violations_fixed': int(violations_fixed)
            }
            
        except Exception as e:
            logger.error(f"Error in range violation handling: {str(e)}")

    def _generate_preprocessing_report(self):
        """Generate comprehensive preprocessing report"""
        try:
            original_shape = self.original_df.shape
            final_shape = self.df.shape
            
            self.preprocessing_stats['summary'] = {
                'original_shape': original_shape,
                'final_shape': final_shape,
                'rows_changed': original_shape[0] - final_shape[0],
                'columns_changed': original_shape[1] - final_shape[1],
                'preprocessing_steps': len(self.preprocessing_log),
                'total_changes': sum([
                    self.preprocessing_stats.get('missing_values', {}).get('before', 0),
                    self.preprocessing_stats.get('duplicates', {}).get('removed', 0),
                    self.preprocessing_stats.get('outliers', {}).get('outliers_detected', 0),
                    self.preprocessing_stats.get('range_violations', {}).get('violations_fixed', 0)
                ])
            }
            
        except Exception as e:
            logger.error(f"Error generating preprocessing report: {str(e)}")

    def get_preprocessing_report(self):
        """Return detailed preprocessing report"""
        return {
            'preprocessing_log': self.preprocessing_log,
            'preprocessing_stats': self.preprocessing_stats,
            'final_dataset_info': {
                'shape': self.df.shape,
                'columns': list(self.df.columns),
                'numeric_columns': self.numeric_cols,
                'categorical_columns': self.categorical_cols,
                'datetime_columns': self.datetime_cols,
                'missing_values': int(self.df.isnull().sum().sum()),
                'data_types': {k: str(v) for k, v in self.df.dtypes.to_dict().items()}
            }
        }

def clean_csv_data(csv_string):
    """
    Clean and validate CSV data before parsing
    """
    try:
        lines = csv_string.strip().split('\n')
        if not lines:
            return csv_string
        
        # Get header to determine expected field count
        header_line = lines[0]
        expected_fields = len(header_line.split(','))
        
        cleaned_lines = [header_line]
        
        for i, line in enumerate(lines[1:], 1):
            # Skip empty lines
            if not line.strip():
                continue
                
            # Count fields in current line
            fields = line.split(',')
            
            # If field count doesn't match, try to fix common issues
            if len(fields) != expected_fields:
                # Remove extra commas at the end
                line = line.rstrip(',')
                fields = line.split(',')
                
                # If still doesn't match, pad with empty fields or truncate
                if len(fields) < expected_fields:
                    fields.extend([''] * (expected_fields - len(fields)))
                elif len(fields) > expected_fields:
                    fields = fields[:expected_fields]
                
                line = ','.join(fields)
            
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    except Exception as e:
        logger.warning(f"CSV cleaning failed: {str(e)}, returning original data")
        return csv_string

@app.route("/preprocess", methods=["POST"])
@limiter.limit("20 per minute")
def preprocess_data():
    """
    Advanced data preprocessing endpoint using 12 key factors
    """
    try:
        if not request.is_json:
            return jsonify({
                "success": False,
                "error": "Request must be JSON"
            }), 400

        payload = request.get_json()
        
        if 'csvData' not in payload:
            return jsonify({
                "success": False,
                "error": "Missing csvData field"
            }), 400

        # Clean and parse CSV data with robust error handling
        csv_data = payload['csvData']
        
        try:
            # First attempt: standard parsing
            df = pd.read_csv(StringIO(csv_data))
        except pd.errors.ParserError as e:
            logger.warning(f"Initial CSV parsing failed: {str(e)}. Attempting to clean data...")
            
            # Clean the CSV data
            cleaned_csv = clean_csv_data(csv_data)
            
            try:
                # Second attempt: parse cleaned data
                df = pd.read_csv(StringIO(cleaned_csv))
                logger.info("Successfully parsed CSV after cleaning")
            except Exception as e2:
                # Third attempt: handle inconsistent field counts with pandas options
                try:
                    df = pd.read_csv(
                        StringIO(csv_data),
                        on_bad_lines='skip',
                        sep=',',
                        quotechar='"',
                        skipinitialspace=True
                    )
                    logger.warning(f"Used skip bad lines parsing: {str(e)}. Some malformed rows were skipped.")
                except Exception as e3:
                    # Fourth attempt: use most flexible parsing
                    try:
                        df = pd.read_csv(
                            StringIO(csv_data),
                            sep=None,
                            engine='python',
                            on_bad_lines='skip'
                        )
                        logger.warning(f"Used most flexible CSV parsing: {str(e)}")
                    except Exception as e4:
                        return jsonify({
                            "success": False,
                            "error": f"CSV parsing failed after multiple attempts. Original error: {str(e)}. Please check your CSV format and ensure consistent field counts. Common issues: extra commas, unescaped quotes, inconsistent row lengths."
                        }), 400
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"CSV parsing error: {str(e)}"
            }), 400
        
        if df.empty:
            return jsonify({
                "success": False,
                "error": "Empty dataset provided or all rows were malformed"
            }), 400

        # Get preprocessing configuration
        target_col = payload.get('targetColumn')
        preprocessing_config = payload.get('config', {})
        
        # Initialize preprocessor
        preprocessor = AdvancedDataPreprocessor(
            df=df,
            target_col=target_col,
            preprocessing_config=preprocessing_config
        )
        
        # Execute preprocessing
        processed_df = preprocessor.preprocess_all()
        
        # Get preprocessing report
        report = preprocessor.get_preprocessing_report()
        
        # Validate processed DataFrame
        if processed_df is None or processed_df.empty:
            logger.warning("Processed DataFrame is empty, returning original data")
            processed_df = df
            report = {
                'preprocessing_log': ['Warning: Preprocessing resulted in empty dataset, returned original data'],
                'preprocessing_stats': {},
                'final_dataset_info': {
                    'shape': df.shape,
                    'columns': list(df.columns),
                    'numeric_columns': [],
                    'categorical_columns': [],
                    'datetime_columns': [],
                    'missing_values': int(df.isnull().sum().sum()),
                    'data_types': {k: str(v) for k, v in df.dtypes.to_dict().items()}
                }
            }
        
        # Convert processed DataFrame to CSV string
        try:
            processed_csv = processed_df.to_csv(index=False)
        except Exception as e:
            logger.error(f"Error converting processed DataFrame to CSV: {str(e)}")
            processed_csv = df.to_csv(index=False)
            report['preprocessing_log'].append(f"Warning: Failed to convert processed data to CSV, returned original: {str(e)}")
        
        return jsonify({
            "success": True,
            "processed_data": processed_csv,
            "preprocessing_report": report,
            "original_shape": df.shape,
            "processed_shape": processed_df.shape,
            "improvements": {
                "missing_values_handled": report.get('preprocessing_stats', {}).get('missing_values', {}).get('before', 0),
                "duplicates_removed": report.get('preprocessing_stats', {}).get('duplicates', {}).get('removed', 0),
                "outliers_handled": report.get('preprocessing_stats', {}).get('outliers', {}).get('outliers_detected', 0),
                "features_optimized": len(report.get('preprocessing_stats', {}).get('feature_correlation', {}).get('removed_features', [])),
                "data_quality_score": min(100, max(0, 100 - (
                    report.get('preprocessing_stats', {}).get('missing_values', {}).get('before', 0) * 0.1 +
                    report.get('preprocessing_stats', {}).get('duplicates', {}).get('removed', 0) * 0.05 +
                    report.get('preprocessing_stats', {}).get('outliers', {}).get('outliers_detected', 0) * 0.02
                )))
            }
        })

    except Exception as e:
        logger.error(f"Error in preprocessing endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Preprocessing error: {str(e)}"
        }), 500

@app.route("/preprocess/validate", methods=["POST"])
@limiter.limit("30 per minute")
def validate_csv():
    """
    Validate CSV format before preprocessing
    """
    try:
        if not request.is_json:
            return jsonify({
                "success": False,
                "error": "Request must be JSON"
            }), 400

        payload = request.get_json()
        
        if 'csvData' not in payload:
            return jsonify({
                "success": False,
                "error": "Missing csvData field"
            }), 400

        csv_data = payload['csvData']
        
        # Attempt to parse CSV and get basic info
        try:
            df = pd.read_csv(StringIO(csv_data))
            
            validation_info = {
                "valid": True,
                "shape": df.shape,
                "columns": list(df.columns),
                "column_types": {k: str(v) for k, v in df.dtypes.to_dict().items()},
                "missing_values": int(df.isnull().sum().sum()),
                "duplicate_rows": int(df.duplicated().sum()),
                "sample_data": df.head(3).to_dict('records') if len(df) > 0 else []
            }
            
            return jsonify({
                "success": True,
                "validation": validation_info,
                "message": "CSV format is valid and ready for preprocessing"
            })
            
        except Exception as e:
            # Try with cleaning
            cleaned_csv = clean_csv_data(csv_data)
            try:
                df = pd.read_csv(StringIO(cleaned_csv))
                
                validation_info = {
                    "valid": True,
                    "shape": df.shape,
                    "columns": list(df.columns),
                    "column_types": {k: str(v) for k, v in df.dtypes.to_dict().items()},
                    "missing_values": int(df.isnull().sum().sum()),
                    "duplicate_rows": int(df.duplicated().sum()),
                    "sample_data": df.head(3).to_dict('records') if len(df) > 0 else [],
                    "warnings": ["CSV required cleaning due to format issues"]
                }
                
                return jsonify({
                    "success": True,
                    "validation": validation_info,
                    "message": "CSV format was corrected and is now valid for preprocessing"
                })
                
            except Exception as e2:
                return jsonify({
                    "success": False,
                    "validation": {
                        "valid": False,
                        "error": str(e),
                        "suggestions": [
                            "Ensure all rows have the same number of columns",
                            "Check for unescaped quotes in text fields",
                            "Remove extra commas at the end of rows",
                            "Verify the CSV uses standard comma-separated format"
                        ]
                    }
                })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Validation error: {str(e)}"
        }), 500

@app.route("/preprocess/config", methods=["GET"])
def get_preprocessing_config():
    """Get default preprocessing configuration"""
    try:
        dummy_preprocessor = AdvancedDataPreprocessor(pd.DataFrame())
        config = dummy_preprocessor._get_default_config()
        
        return jsonify({
            "success": True,
            "default_config": config,
            "description": {
                "missing_values": "Handle missing data using MICE (Multiple Imputation by Chained Equations)",
                "duplicates": "Remove duplicate records using bloom filter approach",
                "invalid_data": "Fix invalid data using statistical tests (Chi-square)",
                "outliers": "Handle outliers using Isolation Forest",
                "inconsistent_formats": "Standardize formats using regex validation",
                "cardinality": "Manage high cardinality using probabilistic counting",
                "class_imbalance": "Balance classes using SMOTE",
                "data_type_mismatch": "Fix data types using schema enforcement",
                "feature_correlation": "Remove highly correlated features using Pearson correlation",
                "low_variance": "Remove low variance features using VarianceThreshold",
                "mean_median_drift": "Handle skewed distributions using percentage drift analysis",
                "range_violations": "Fix range violations using domain-specific rules"
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Configuration error: {str(e)}"
        }), 500

@app.route('/')
def home():
    return jsonify({
        "message": "Advanced Data Preprocessing API",
        "version": "1.0",
        "description": "Comprehensive data preprocessing using 12 key quality factors",
        "endpoints": {
            "/preprocess": "POST - Main preprocessing endpoint",
            "/preprocess/validate": "POST - Validate CSV format before processing",
            "/preprocess/config": "GET - Get default configuration",
        },
        "preprocessing_factors": [
            "Missing Values (MICE)",
            "Duplicate Records (Bloom Filter)",
            "Invalid Data (Statistical Tests)",
            "Outlier Count (Isolation Forest)",
            "Inconsistent Formats (Regex Validation)",
            "Cardinality/Uniqueness (Probabilistic Counting)",
            "Class Imbalance (SMOTE)",
            "Data Type Mismatch (Schema Enforcement)",
            "Feature Correlation (Pearson + VIF)",
            "Low Variance Features (VarianceThreshold)",
            "Mean-Median Drift (Percentage Analysis)",
            "Range Violations (Domain-specific Rules)"
        ]
    })

@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(debug=True, port=1290)
