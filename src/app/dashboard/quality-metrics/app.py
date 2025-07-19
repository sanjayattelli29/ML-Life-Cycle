# data_quality_api.py

import pandas as pd
import numpy as np
import warnings
import logging
import re
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import cross_val_score, KFold
from sklearn.metrics import pairwise_distances_argmin_min, silhouette_score
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.cluster import KMeans
from scipy.stats import skew, kurtosis
from scipy import stats
from itertools import combinations
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from io import StringIO

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
# Configure rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Configure CORS options
app.config['CORS_HEADERS'] = 'Content-Type'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

warnings.filterwarnings('ignore')

class DataQualityAnalyzer:
    def __init__(self, df, target_col=None):
        self.df = df.copy()
        self.target_col = target_col
        self.metrics = {}
        self.numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        self.cat_cols = self.df.select_dtypes(include=['object', 'category']).columns
        self.date_cols = self.df.select_dtypes(include=['datetime64[ns]', 'datetime64']).columns

    def calculate_all_metrics(self):
        self._missing_values_metrics()
        self._duplication_metrics()
        self._outlier_metrics()
        self._data_type_metrics()
        self._categorical_metrics()
        self._target_metrics()
        self._correlation_metrics()
        self._distribution_metrics()
        self._data_freshness()
        return pd.DataFrame([self.metrics])

    def _missing_values_metrics(self):
        try:
            total_cells = self.df.size
            missing_cells = self.df.isnull().sum().sum()
            self.metrics['missing_values_pct'] = (missing_cells / total_cells) * 100 if total_cells > 0 else 0.0
        except Exception as e:
            logger.warning(f"Error in _missing_values_metrics: {e}")
            self.metrics['missing_values_pct'] = 0.0
    def _duplication_metrics(self):
        try:
            self.metrics['duplicate_rows_count'] = int(self.df.duplicated().sum())
        except Exception as e:
            logger.warning(f"Error in _duplication_metrics: {e}")
            self.metrics['duplicate_rows_count'] = 0
    def _outlier_metrics(self):
        try:
            if len(self.numeric_cols) > 1:
                numeric_data = self.df[self.numeric_cols].copy()
                numeric_data = numeric_data.fillna(numeric_data.median())  # Safer than filling with 0
                iso = IsolationForest(contamination=0.05, random_state=42)
                preds = iso.fit_predict(numeric_data)
                outlier_fraction = (preds == -1).mean()
                self.metrics['outlier_rate'] = round(outlier_fraction, 4)
            else:
                self.metrics['outlier_rate'] = 0.0  # Not enough numeric features
        except Exception as e:
            logger.warning(f"Error in _outlier_metrics: {e}")
            self.metrics['outlier_rate'] = 0.0


    def _data_type_metrics(self):
        mismatches = 0
        for col in self.df.columns:
            if self.df[col].dtype == object:
                try:
                    pd.to_numeric(self.df[col])
                except:
                    mismatches += 1
        self.metrics['data_type_mismatch_count'] = mismatches

    def _categorical_metrics(self):
        self.metrics['categorical_cardinality'] = {col: self.df[col].nunique() for col in self.cat_cols}

    def _target_metrics(self):
        if self.target_col and self.target_col in self.df.columns:
            y = self.df[self.target_col]
            if y.nunique() > 1 and y.dtype in ['object', 'int64']:
                X = self.df[self.numeric_cols].fillna(0)
                clf = RandomForestClassifier(n_estimators=10)
                scores = cross_val_score(clf, X, y, cv=3)
                self.metrics['label_noise_estimate'] = 1 - scores.mean()

    def _correlation_metrics(self):
        if len(self.numeric_cols) > 1:
            corr = self.df[self.numeric_cols].corr().abs()
            upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
            self.metrics['high_correlation_pairs'] = (upper > 0.8).sum().sum()
            self.metrics['mean_abs_correlation'] = upper.stack().mean()

    def _distribution_metrics(self):
        skew_vals = [abs(skew(self.df[col].dropna())) for col in self.numeric_cols if self.df[col].nunique() > 5]
        kurt_vals = [abs(kurtosis(self.df[col].dropna()) - 3) for col in self.numeric_cols if self.df[col].nunique() > 5]
        self.metrics['mean_abs_skewness'] = np.mean(skew_vals) if skew_vals else np.nan
        self.metrics['mean_abs_kurtosis'] = np.mean(kurt_vals) if kurt_vals else np.nan

    def _data_freshness(self):
        if len(self.date_cols) > 0:
            try:
                max_dates = [self.df[col].max() for col in self.date_cols if not pd.isna(self.df[col].max())]
                if max_dates:
                    freshness_days = (pd.Timestamp.now() - max(max_dates)).days
                    self.metrics['data_freshness_days'] = freshness_days
            except:
                self.metrics['data_freshness_days'] = np.nan

class AutoDataCleaner:
    def __init__(self, df, target_col=None):
        self.df = df.copy()
        self.target_col = target_col
        self.transformations = []
        self.initial_shape = df.shape

    def clean(self):
        """
        Perform comprehensive data cleaning using a multi-step approach.
        Returns cleaned DataFrame and maintains a log of transformations.
        """
        try:
            self._handle_missing_values()
            self._remove_duplicates()
            self._fix_data_types()
            self._handle_outliers()
            self._encode_categoricals()
            self._normalize_numeric()
            self._add_summary_stats()
            return self.df
        except Exception as e:
            logger.error(f"Error during data cleaning: {e}")
            return self.df

    def _handle_missing_values(self):
        """Handle missing values using sophisticated imputation strategies."""
        for col in self.df.columns:
            missing_pct = self.df[col].isnull().mean()
            
            if missing_pct > 0.5:
                self.df.drop(columns=[col], inplace=True)
                self.transformations.append(f"Dropped column {col} with {missing_pct:.1%} missing values")
            elif missing_pct > 0:
                if pd.api.types.is_numeric_dtype(self.df[col]):
                    # For numeric columns, use median for skewed data, mean otherwise
                    skewness = self.df[col].skew()
                    if abs(skewness) > 1:
                        self.df[col].fillna(self.df[col].median(), inplace=True)
                        self.transformations.append(f"Filled missing values in {col} with median due to skewness")
                    else:
                        self.df[col].fillna(self.df[col].mean(), inplace=True)
                        self.transformations.append(f"Filled missing values in {col} with mean")
                elif pd.api.types.is_datetime64_dtype(self.df[col]):
                    # For datetime, use forward fill then backward fill
                    self.df[col].fillna(method='ffill', inplace=True)
                    self.df[col].fillna(method='bfill', inplace=True)
                    self.transformations.append(f"Filled missing datetime values in {col} using forward/backward fill")
                else:
                    # For categorical, use mode and add 'Unknown' category for remaining
                    mode_val = self.df[col].mode()[0]
                    self.df[col].fillna(mode_val, inplace=True)
                    self.transformations.append(f"Filled missing values in {col} with mode: {mode_val}")

    def _remove_duplicates(self):
        """Remove duplicate rows while preserving important data."""
        before_count = len(self.df)
        self.df = self.df.drop_duplicates(keep='first')
        removed_count = before_count - len(self.df)
        if removed_count > 0:
            self.transformations.append(f"Removed {removed_count} duplicate rows")

    def _fix_data_types(self):
        """Fix and optimize data types for each column."""
        for col in self.df.columns:
            try:
                # Try to convert to numeric
                if self.df[col].dtype == 'object':
                    try:
                        numeric_values = pd.to_numeric(self.df[col])
                        self.df[col] = numeric_values
                        self.transformations.append(f"Converted {col} to numeric type")
                        continue
                    except:
                        pass

                    # Try to convert to datetime
                    try:
                        datetime_values = pd.to_datetime(self.df[col])
                        self.df[col] = datetime_values
                        self.transformations.append(f"Converted {col} to datetime type")
                        continue
                    except:
                        pass

                # Optimize categorical columns
                if self.df[col].dtype.name == 'object':
                    if self.df[col].nunique() / len(self.df) < 0.5:  # If less than 50% unique values
                        self.df[col] = self.df[col].astype('category')
                        self.transformations.append(f"Converted {col} to categorical type")

            except Exception as e:
                logger.warning(f"Could not optimize type for column {col}: {str(e)}")

    def _handle_outliers(self):
        """Handle outliers in numeric columns using IQR method."""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if col != self.target_col:  # Don't modify target variable
                Q1 = self.df[col].quantile(0.25)
                Q3 = self.df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 3 * IQR
                upper_bound = Q3 + 3 * IQR
                
                outliers = ((self.df[col] < lower_bound) | (self.df[col] > upper_bound))
                if outliers.sum() > 0:
                    self.df.loc[outliers, col] = self.df[col].median()
                    self.transformations.append(f"Replaced {outliers.sum()} outliers in {col} with median")

    def _encode_categoricals(self):
        """Encode categorical variables using appropriate methods."""
        categorical_cols = self.df.select_dtypes(include=['object', 'category']).columns
        
        for col in categorical_cols:
            if col != self.target_col:
                if self.df[col].nunique() <= 2:  # Binary encoding
                    le = LabelEncoder()
                    self.df[col] = le.fit_transform(self.df[col])
                    self.transformations.append(f"Applied binary encoding to {col}")
                else:  # One-hot encoding
                    dummies = pd.get_dummies(self.df[col], prefix=col, drop_first=True)
                    self.df = pd.concat([self.df.drop(columns=[col]), dummies], axis=1)
                    self.transformations.append(f"Applied one-hot encoding to {col}")

    def _normalize_numeric(self):
        """Normalize numeric columns while preserving the target variable."""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        if self.target_col and self.target_col in numeric_cols:
            numeric_cols = numeric_cols.drop(self.target_col)
        
        if len(numeric_cols) > 0:
            scaler = StandardScaler()
            self.df[numeric_cols] = scaler.fit_transform(self.df[numeric_cols])
            self.transformations.append(f"Normalized {len(numeric_cols)} numeric columns")

    def _add_summary_stats(self):
        """Add a summary of the cleaning process to transformations."""
        final_shape = self.df.shape
        rows_removed = self.initial_shape[0] - final_shape[0]
        cols_removed = self.initial_shape[1] - final_shape[1]
        
        summary = [
            f"Initial dataset shape: {self.initial_shape}",
            f"Final dataset shape: {final_shape}",
            f"Rows removed: {rows_removed}",
            f"Columns removed/modified: {cols_removed}"
        ]
        self.transformations.extend(summary)

class DataQualityMetrics:
    def __init__(self, dataset_id=None, random_seed=42):
        self.dataset_id = dataset_id or f'DS_{np.random.randint(1, 999):03d}'
        self.random_seed = random_seed
        np.random.seed(random_seed)

        self.metric_ranges = {
            'Missing_Values_Pct': (0, 30),
            'Duplicate_Records_Count': (0, 100),
            'Outlier_Rate': (0, 0.15),
            'Inconsistency_Rate': (0, 0.1),
            'Data_Type_Mismatch_Rate': (0, 0.05),
            'Null_vs_NaN_Distribution': (0, 1),
            'Cardinality_Categorical': (1, 100),
            'Target_Imbalance': (0, 1),
            'Feature_Correlation_Mean': (0, 1),
            'Range_Violation_Rate': (0, 0.1),
            'Mean_Median_Drift': (0, 0.2),
            'Class_Overlap_Score': (0, 1),
            'Data_Freshness': (0, 365),
            'Feature_Importance_Consistency': (0, 1),
            'Anomaly_Count': (0, 100),
            'Encoding_Coverage_Rate': (0.7, 1),
            'Variance_Threshold_Check': (0, 0.1),
            'Data_Density_Completeness': (0.5, 1),
            'Label_Noise_Rate': (0, 0.1),
            'Domain_Constraint_Violations': (0, 0.1),
            'Data_Quality_Score': (0, 100)
        }

    def _get_random_fallback(self, metric_name):
        low, high = self.metric_ranges.get(metric_name, (0, 1))
        if metric_name == 'Data_Quality_Score':
            return np.random.randint(50, 100)  # Return a reasonable quality score
        elif metric_name in ['Duplicate_Records_Count', 'Anomaly_Count', 'Cardinality_Categorical']:
            return np.random.randint(low, high + 1)  # Integer values for count metrics
        else:
            return np.random.uniform(low, high)  # Float values for percentage metrics

    def _is_date_column(self, series):
        try:
            pd.to_datetime(series.dropna())
            return True
        except:
            return False

    def _detect_column_types(self, df):
        """
        Enhanced column type detection with comprehensive checks for numeric, date and mixed types.
        """
        numeric_cols = []
        categorical_cols = []
        date_cols = []
        
        if not isinstance(df, pd.DataFrame) or len(df.columns) == 0:
            return numeric_cols, categorical_cols, date_cols

        # Common date patterns for checking string dates    
        date_patterns = [
            r'\d{4}[-/]\d{2}[-/]\d{2}',  # yyyy-mm-dd or yyyy/mm/dd
            r'\d{2}[-/]\d{2}[-/]\d{4}',  # dd-mm-yyyy or dd/mm/yyyy
            r'\d{2}[-/][A-Za-z]{3}[-/]\d{4}',  # dd-mon-yyyy
            r'[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}'  # mon dd, yyyy
        ]
            
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                numeric_cols.append(col)
                continue
                
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                date_cols.append(col)
                continue
                
            # For object/string columns, try deeper analysis
            series = df[col].dropna()
            if len(series) == 0:
                categorical_cols.append(col)
                continue
                
            # Try numeric conversion
            numeric_series = pd.to_numeric(series, errors='coerce')
            if numeric_series.notna().mean() > 0.8:  # If >80% convert to numeric
                numeric_cols.append(col)
                continue
            
            # Try datetime conversion
            date_series = pd.to_datetime(series, errors='coerce')
            if date_series.notna().mean() > 0.8:  # If >80% convert to datetime
                date_cols.append(col)
                continue
                
            # Check for string date patterns
            if isinstance(series.iloc[0], str):
                date_pattern_matches = series.astype(str).apply(
                    lambda x: any(re.match(pattern, x.strip()) for pattern in date_patterns)
                ).mean()
                if date_pattern_matches > 0.8:  # If >80% match date patterns
                    date_cols.append(col)
                    continue
            
            # If no clear type detected, treat as categorical
            categorical_cols.append(col)
                
        return numeric_cols, categorical_cols, date_cols

    def calculate_metrics(self, df, target_col=None) -> pd.DataFrame:
        """
        Calculate data quality metrics for the given DataFrame, including:
        - Missing Value
        - Duplicate Records
        - Invalid Data
        - Outlier Count
        - Inconsistent Formats
        - Cardinality/Uniqueness
        - Class Imbalance
        - Data Type Mismatch
        - Feature Correlation
        - Low Variance Features
        - Mean-Median Drift
        - Range Violations
        """
        try:
            # Detect column types
            numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
            categorical_cols = list(df.select_dtypes(include=['object', 'category']).columns)
            n_rows = len(df)
            n_cols = len(df.columns)

            # Missing Values
            missing_count = int(df.isnull().sum().sum())
            missing_pct = (missing_count / (n_rows * n_cols) * 100) if n_rows * n_cols > 0 else 0.0

            # Duplicate Records
            duplicate_count = int(df.duplicated().sum())
            duplicate_pct = (duplicate_count / n_rows * 100) if n_rows > 0 else 0.0

            # Invalid Data (count columns with type mismatch)
            mismatch_count = 0
            for col in df.columns:
                if df[col].dtype == object:
                    try:
                        pd.to_numeric(df[col])
                    except:
                        mismatch_count += 1
            mismatch_pct = (mismatch_count / n_cols * 100) if n_cols > 0 else 0.0

            # Data Type Mismatch (per value, not just per column)
            dtm_count = 0
            dtm_total = 0
            for col in df.columns:
                series = df[col].dropna()
                if len(series) == 0:
                    continue
                dominant_type = series.map(type).mode()[0]
                mismatches = (series.map(type) != dominant_type).sum()
                dtm_count += mismatches
                dtm_total += len(series)
            dtm_pct = (dtm_count / dtm_total * 100) if dtm_total > 0 else 0.0

            # Outlier Count (IsolationForest)
            outlier_count = 0
            if len(numeric_cols) > 1:
                numeric_data = df[numeric_cols].fillna(df[numeric_cols].median())
                iso = IsolationForest(contamination=0.05, random_state=42)
                preds = iso.fit_predict(numeric_data)
                outlier_count = int((preds == -1).sum())
            outlier_pct = (outlier_count / n_rows * 100) if n_rows > 0 else 0.0

            # Inconsistent Formats (count columns with >1 dtype or format)
            incons_count = 0
            for col in df.columns:
                if df[col].dtype == object:
                    unique_types = set(type(x) for x in df[col].dropna())
                    if len(unique_types) > 1:
                        incons_count += 1
            incons_pct = (incons_count / n_cols * 100) if n_cols > 0 else 0.0

            # Cardinality/Uniqueness (categorical columns)
            cardinality = 0
            if categorical_cols:
                cardinality = int(np.mean([df[col].nunique() for col in categorical_cols]))

            # Class Imbalance (distribution and imbalance score)
            class_imbalance = {'distribution': {}, 'imbalance_score': 0.0}
            if target_col and target_col in df.columns:
                value_counts = df[target_col].value_counts().to_dict()
                class_imbalance['distribution'] = value_counts
                if len(value_counts) > 1:
                    min_class = min(value_counts.values())
                    total = sum(value_counts.values())
                    class_imbalance['imbalance_score'] = 1 - (min_class / total)
            else:
                if categorical_cols:
                    col = categorical_cols[0]
                    value_counts = df[col].value_counts().to_dict()
                    class_imbalance['distribution'] = value_counts
                    if len(value_counts) > 1:
                        min_class = min(value_counts.values())
                        total = sum(value_counts.values())
                        class_imbalance['imbalance_score'] = 1 - (min_class / total)

            # Data Type Mismatch (already calculated as dtm_count, dtm_total, dtm_pct)

            # Feature Correlation (mean absolute Pearson correlation)
            feature_corr = 0.0
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr().abs()
                upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                vals = upper.stack().values
                if len(vals) > 0:
                    feature_corr = float(np.mean(vals))
            feature_corr_pct = feature_corr * 100

            # Low Variance Features (variance < 0.01)
            low_var_count = 0
            for col in numeric_cols:
                series = df[col].dropna()
                if len(series) > 1 and np.var(series) < 0.01:
                    low_var_count += 1
            low_var_total = len(numeric_cols)
            low_var_pct = (low_var_count / low_var_total * 100) if low_var_total > 0 else 0.0

            # Mean-Median Drift (mean abs(mean-median)/std)
            mm_drift = 0.0
            mm_count = 0
            for col in numeric_cols:
                series = df[col].dropna()
                if len(series) > 1 and series.std() > 0:
                    mm_drift += abs(series.mean() - series.median()) / series.std()
                    mm_count += 1
            mm_drift_val = (mm_drift / mm_count) if mm_count > 0 else 0.0
            mm_drift_pct = mm_drift_val * 100

            # Range Violations (values outside mean ± 3*std)
            range_viol_count = 0
            range_viol_total = 0
            for col in numeric_cols:
                series = df[col].dropna()
                if len(series) > 1:
                    mean = series.mean()
                    std = series.std()
                    lower = mean - 3 * std
                    upper = mean + 3 * std
                    range_viol_count += ((series < lower) | (series > upper)).sum()
                    range_viol_total += len(series)
            range_viol_pct = (range_viol_count / range_viol_total * 100) if range_viol_total > 0 else 0.0

            # Statistical Summaries (optional, if frontend expects it)
            stats = {}
            for col in numeric_cols:
                series = df[col].dropna()
                if len(series) > 0:
                    stats[col] = {
                        'mean': float(series.mean()),
                        'median': float(series.median()),
                        'std': float(series.std())
                    }

            metrics = {
                'Missing_Values': {'count': missing_count, 'total': n_rows * n_cols, 'pct': missing_pct},
                'Duplicate_Records': {'count': duplicate_count, 'total': n_rows, 'pct': duplicate_pct},
                'Invalid_Data': {'count': mismatch_count, 'total': n_cols, 'pct': mismatch_pct},
                'Outlier_Count': {'count': outlier_count, 'total': n_rows, 'pct': outlier_pct},
                'Inconsistent_Formats': {'count': incons_count, 'total': n_cols, 'pct': incons_pct},
                'Cardinality_Uniqueness': {'count': cardinality, 'total': len(categorical_cols)},
                'Class_Imbalance': class_imbalance,
                'Data_Type_Mismatch': {'count': dtm_count, 'total': dtm_total, 'pct': dtm_pct},
                'Feature_Correlation': {'count': feature_corr, 'total': 1, 'pct': feature_corr_pct},
                'Low_Variance_Features': {'count': low_var_count, 'total': low_var_total, 'pct': low_var_pct},
                'Mean_Median_Drift': {'count': mm_drift_val, 'total': mm_count, 'pct': mm_drift_pct},
                'Range_Violations': {'count': range_viol_count, 'total': range_viol_total, 'pct': range_viol_pct},
                'Statistical_Summaries': stats
            }

            return pd.DataFrame([metrics])
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            return pd.DataFrame([{
                'Missing_Values': {'count': 0, 'total': 0, 'pct': 0.0},
                'Duplicate_Records': {'count': 0, 'total': 0, 'pct': 0.0},
                'Invalid_Data': {'count': 0, 'total': 0, 'pct': 0.0},
                'Outlier_Count': {'count': 0, 'total': 0, 'pct': 0.0},
                'Inconsistent_Formats': {'count': 0, 'total': 0, 'pct': 0.0},
                'Cardinality_Uniqueness': {'count': 0, 'total': 0},
                'Class_Imbalance': {'distribution': {}, 'imbalance_score': 0.0},
                'Data_Type_Mismatch': {'count': 0, 'total': 0, 'pct': 0.0},
                'Feature_Correlation': {'count': 0.0, 'total': 1, 'pct': 0.0},
                'Low_Variance_Features': {'count': 0, 'total': 0, 'pct': 0.0},
                'Mean_Median_Drift': {'count': 0.0, 'total': 0, 'pct': 0.0},
                'Range_Violations': {'count': 0, 'total': 0, 'pct': 0.0},
                'Statistical_Summaries': {}
            }])

@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Process CSV data and return data quality metrics.
    """
    try:
        if not request.is_json:
            return jsonify({
                "success": False,
                "error": "Request must be JSON"
            }), 400

        payload = request.get_json()
        
        def process_single_file(csv_data, target_col=None):
            try:
                # Convert CSV string to DataFrame
                df = pd.read_csv(StringIO(csv_data))
                
                # Calculate metrics
                metrics_calculator = DataQualityMetrics()
                return metrics_calculator.calculate_metrics(df, target_col).to_dict('records')[0]
                
            except Exception as e:
                logger.error(f"Error processing file: {str(e)}")
                return {
                    "success": False,
                    "error": f"Error processing file: {str(e)}"
                }

        # Handle batch processing
        if isinstance(payload, list):
            if not payload:
                return jsonify({
                    "success": False,
                    "error": "Empty batch list"
                }), 400

            results = []
            for idx, item in enumerate(payload):
                try:
                    if not isinstance(item, dict) or 'csvData' not in item:
                        raise ValueError(f"Invalid item format at index {idx}")
                    
                    metrics = process_single_file(
                        item['csvData'],
                        item.get('targetColumn')
                    )
                    results.append(metrics)
                    
                except Exception as e:
                    results.append({
                        "success": False,
                        "error": f"Error processing item {idx}: {str(e)}"
                    })
            
            return jsonify({
                "success": True,
                "results": results
            })
            
        # Handle single file
        elif isinstance(payload, dict):
            if 'csvData' not in payload:
                return jsonify({
                    "success": False,
                    "error": "Missing csvData field"
                }), 400
                
            metrics = process_single_file(
                payload['csvData'],
                payload.get('targetColumn')
            )
            
            return jsonify({
                "success": True,
                "metrics": metrics
            })
            
        else:
            return jsonify({
                "success": False,
                "error": "Invalid payload format"
            }), 400

    except Exception as e:
        logger.error(f"Error in analyze endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to the Metrics Data Quality API",
        "version": "1.0",
        "endpoints": [
            "/analyze/data_quality",
            "/analyze/anomaly_detection",
            "/analyze/feature_importance",
            "/analyze/correlation_analysis"
        ]
    })

@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(debug=True, port=1289)
