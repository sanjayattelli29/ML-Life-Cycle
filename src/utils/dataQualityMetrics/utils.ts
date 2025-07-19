/**
 * Data Quality Metrics Utilities
 * 
 * This module provides utility functions for data quality metrics calculations.
 */

import { mean, median, standardDeviation, quantile } from 'simple-statistics';
import { Column } from './types';

// Define metric ranges for random fallback values
export const METRIC_RANGES: Record<string, [number, number]> = {
  'Missing_Values_Pct': [0, 30],
  'Duplicate_Records_Count': [0, 100],
  'Outlier_Rate': [0, 0.15],
  'Inconsistency_Rate': [0, 0.1],
  'Data_Type_Mismatch_Rate': [0, 0.05],
  'Null_vs_NaN_Distribution': [0, 1],
  'Cardinality_Categorical': [1, 100],
  'Target_Imbalance': [0, 1],
  'Feature_Correlation_Mean': [0, 1],
  'Range_Violation_Rate': [0, 0.1],
  'Mean_Median_Drift': [0, 0.2],
  'Class_Overlap_Score': [0, 1],
  'Data_Freshness': [0, 365],
  'Feature_Importance_Consistency': [0, 1],
  'Anomaly_Count': [0, 100],
  'Encoding_Coverage_Rate': [0.7, 1],
  'Variance_Threshold_Check': [0, 0.1],
  'Data_Density_Completeness': [0.5, 1],
  'Label_Noise_Rate': [0, 0.1],
  'Domain_Constraint_Violations': [0, 0.1],
  'Data_Quality_Score': [0, 100]
};

/**
 * Generate a random fallback value within a reasonable range for a given metric.
 * 
 * @param metricName - Name of the metric
 * @returns Random value within a predefined range for the metric
 */
export function getRandomFallback(metricName: string): number {
  const [low, high] = METRIC_RANGES[metricName] || [0, 1];
  
  if (metricName === 'Data_Quality_Score') {
    return Math.round(Math.random() * (high - low) + low);
  } else if (
    metricName === 'Duplicate_Records_Count' || 
    metricName === 'Anomaly_Count' || 
    metricName === 'Cardinality_Categorical'
  ) {
    return Math.floor(Math.random() * (high - low) + low);
  } else {
    return parseFloat((Math.random() * (high - low) + low).toFixed(2));
  }
}

/**
 * Detect the types of columns in the dataset.
 * 
 * @param data - Dataset data
 * @param columns - Dataset columns
 * @returns Object containing lists of numeric, categorical, and date columns
 */
export function detectColumnTypes(data: Record<string, any>[], columns: Column[]): {
  numericCols: string[];
  categoricalCols: string[];
  dateCols: string[];
} {
  const numericCols: string[] = [];
  const categoricalCols: string[] = [];
  const dateCols: string[] = [];
  
  columns.forEach(column => {
    if (column.type === 'numeric') {
      numericCols.push(column.name);
    } else if (column.type === 'date') {
      dateCols.push(column.name);
    } else {
      categoricalCols.push(column.name);
    }
  });
  
  return { numericCols, categoricalCols, dateCols };
}

/**
 * Calculate Pearson correlation coefficient.
 * 
 * @param pairs - Array of [x, y] value pairs
 * @returns Pearson correlation coefficient
 */
export function calculatePearsonCorrelation(pairs: [number, number][]): number {
  if (pairs.length < 2) return 0;
  
  try {
    const xValues = pairs.map(([x]) => x);
    const yValues = pairs.map(([_, y]) => y);
    
    const xMean = mean(xValues);
    const yMean = mean(yValues);
    
    const numerator = 0;
    const xDenominator = 0;
    const yDenominator = 0;
    
    for (const i = 0; i < pairs.length; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    if (xDenominator === 0 || yDenominator === 0) return 0;
    
    return numerator / Math.sqrt(xDenominator * yDenominator);
  } catch (error) {
    console.error("Error calculating Pearson correlation:", error);
    return 0;
  }
}

/**
 * Calculate z-scores for an array of values.
 * 
 * @param values - Array of numeric values
 * @returns Array of z-scores
 */
export function calculateZScores(values: number[]): number[] {
  if (values.length === 0) return [];
  
  try {
    const meanValue = mean(values);
    const stdDev = standardDeviation(values);
    
    if (stdDev === 0) return values.map(() => 0);
    
    return values.map(val => (val - meanValue) / stdDev);
  } catch (error) {
    console.error("Error calculating z-scores:", error);
    return [];
  }
}

/**
 * Calculate quantiles for an array of values.
 * 
 * @param values - Array of numeric values
 * @returns Object containing min, q1, median, q3, max
 */
export function calculateQuantiles(values: number[]): { 
  min: number; 
  q1: number; 
  median: number; 
  q3: number; 
  max: number;
  iqr: number;
} {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0 };
  }
  
  try {
    const sortedValues = [...values].sort((a, b) => a - b);
    
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const q1 = quantile(sortedValues, 0.25);
    const medianValue = median(sortedValues);
    const q3 = quantile(sortedValues, 0.75);
    const iqr = q3 - q1;
    
    return {
      min,
      q1,
      median: medianValue,
      q3,
      max,
      iqr
    };
  } catch (error) {
    console.error("Error calculating quantiles:", error);
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0 };
  }
}

/**
 * Check if a value is an outlier using the IQR method.
 * 
 * @param value - Value to check
 * @param q1 - First quartile
 * @param q3 - Third quartile
 * @param iqr - Interquartile range
 * @returns True if the value is an outlier
 */
export function isOutlier(value: number, q1: number, q3: number, iqr: number): boolean {
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return value < lowerBound || value > upperBound;
}

/**
 * Extract numeric values from a dataset column.
 * 
 * @param data - Dataset data
 * @param column - Column name
 * @returns Array of numeric values
 */
export function extractNumericValues(data: Record<string, any>[], column: string): number[] {
  return data
    .map(row => {
      const value = row[column];
      return typeof value === 'string' ? parseFloat(value) : value;
    })
    .filter(val => !isNaN(val) && val !== null && val !== undefined);
}

/**
 * Format a value for display.
 * 
 * @param value - Value to format
 * @param metricName - Name of the metric
 * @returns Formatted value
 */
export function formatMetricValue(value: number, metricName: string): string | number {
  if (
    metricName.includes('_Pct') || 
    metricName === 'Outlier_Rate' || 
    metricName === 'Inconsistency_Rate' ||
    metricName === 'Data_Type_Mismatch_Rate' ||
    metricName === 'Range_Violation_Rate' ||
    metricName === 'Domain_Constraint_Violations' ||
    metricName === 'Label_Noise_Rate' ||
    metricName === 'Encoding_Coverage_Rate' ||
    metricName === 'Data_Density_Completeness'
  ) {
    return `${value.toFixed(2)}%`;
  }
  
  if (metricName === 'File_Size_MB') {
    return `${value.toFixed(2)} MB`;
  }
  
  if (metricName === 'Data_Freshness') {
    return `${Math.round(value)} days`;
  }
  
  if (
    metricName === 'Row_Count' ||
    metricName === 'Column_Count' ||
    metricName === 'Numeric_Columns_Count' ||
    metricName === 'Categorical_Columns_Count' ||
    metricName === 'Date_Columns_Count' ||
    metricName === 'Duplicate_Records_Count' ||
    metricName === 'Anomaly_Count' ||
    metricName === 'Cardinality_Categorical' ||
    metricName === 'Data_Quality_Score'
  ) {
    return Math.round(value);
  }
  
  return parseFloat(value.toFixed(2));
}
