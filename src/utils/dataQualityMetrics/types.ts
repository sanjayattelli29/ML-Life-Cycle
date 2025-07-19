/**
 * Data Quality Metrics Types
 * 
 * This module defines TypeScript types used throughout the data quality metrics system.
 */

// Define types for dataset structure
export interface Column {
  name: string;
  type: 'numeric' | 'text' | 'date';
}

export interface Dataset {
  _id: string;
  name: string;
  columns: Column[];
  data: Record<string, any>[];
}

// Define types for quality metrics
export interface QualityMetric {
  name: string;
  value: number | string;
  description: string;
  category: MetricCategory;
  scoreImpact: 'positive' | 'negative'; // Whether higher values are better or worse
}

export type MetricCategory = 'data_structure' | 'data_quality' | 'statistical' | 'advanced';

// Define metric definitions with descriptions and categories
export const metricDefinitions: Record<string, { 
  description: string; 
  category: MetricCategory; 
  scoreImpact: 'positive' | 'negative' 
}> = {
  // Data Structure metrics
  'Row_Count': {
    description: 'Total number of rows in the dataset',
    category: 'data_structure',
    scoreImpact: 'positive'
  },
  'Column_Count': {
    description: 'Total number of columns in the dataset',
    category: 'data_structure',
    scoreImpact: 'positive'
  },
  'File_Size_MB': {
    description: 'Estimated size of the dataset file',
    category: 'data_structure',
    scoreImpact: 'negative'
  },
  'Numeric_Columns_Count': {
    description: 'Number of numeric columns in the dataset',
    category: 'data_structure',
    scoreImpact: 'positive'
  },
  'Categorical_Columns_Count': {
    description: 'Number of categorical columns in the dataset',
    category: 'data_structure',
    scoreImpact: 'positive'
  },
  'Date_Columns_Count': {
    description: 'Number of date columns in the dataset',
    category: 'data_structure',
    scoreImpact: 'positive'
  },
  
  // Data Quality metrics
  'Missing_Values_Pct': {
    description: 'Percentage of missing values in the dataset',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Duplicate_Records_Count': {
    description: 'Number of duplicate records in the dataset',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Outlier_Rate': {
    description: 'Percentage of outliers detected in numeric columns',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Inconsistency_Rate': {
    description: 'Rate of inconsistent values in the dataset',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Data_Type_Mismatch_Rate': {
    description: 'Rate of values that do not match their column data type',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Null_vs_NaN_Distribution': {
    description: 'Proportion of missing values that are NaN vs NULL',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Range_Violation_Rate': {
    description: 'Percentage of values outside expected ranges',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  'Domain_Constraint_Violations': {
    description: 'Percentage of values violating domain constraints',
    category: 'data_quality',
    scoreImpact: 'negative'
  },
  
  // Statistical metrics
  'Feature_Correlation_Mean': {
    description: 'Average correlation between numeric features',
    category: 'statistical',
    scoreImpact: 'positive'
  },
  'Mean_Median_Drift': {
    description: 'Average difference between mean and median across numeric columns',
    category: 'statistical',
    scoreImpact: 'negative'
  },
  'Cardinality_Categorical': {
    description: 'Average number of unique values in categorical columns',
    category: 'statistical',
    scoreImpact: 'positive'
  },
  'Variance_Threshold_Check': {
    description: 'Measure of features with low variance',
    category: 'statistical',
    scoreImpact: 'negative'
  },
  
  // Advanced metrics
  'Target_Imbalance': {
    description: 'Measure of class imbalance in the target variable',
    category: 'advanced',
    scoreImpact: 'negative'
  },
  'Feature_Importance_Consistency': {
    description: 'Consistency of feature importance across different models',
    category: 'advanced',
    scoreImpact: 'positive'
  },
  'Class_Overlap_Score': {
    description: 'Degree of overlap between different classes',
    category: 'advanced',
    scoreImpact: 'negative'
  },
  'Label_Noise_Rate': {
    description: 'Estimated percentage of incorrect labels',
    category: 'advanced',
    scoreImpact: 'negative'
  },
  'Data_Freshness': {
    description: 'Age of the dataset in days',
    category: 'advanced',
    scoreImpact: 'negative'
  },
  'Anomaly_Count': {
    description: 'Number of anomalies detected in the dataset',
    category: 'advanced',
    scoreImpact: 'negative'
  },
  'Encoding_Coverage_Rate': {
    description: 'Percentage of categorical values covered by encoding',
    category: 'advanced',
    scoreImpact: 'positive'
  },
  'Data_Density_Completeness': {
    description: 'Measure of data density and completeness',
    category: 'advanced',
    scoreImpact: 'positive'
  },
  
  // Overall score
  'Data_Quality_Score': {
    description: 'Overall data quality score (0-100)',
    category: 'data_quality',
    scoreImpact: 'positive'
  }
};
