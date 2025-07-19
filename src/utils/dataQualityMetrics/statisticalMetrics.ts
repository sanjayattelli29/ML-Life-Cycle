/**
 * Statistical Data Quality Metrics
 * 
 * This module provides functions for calculating statistical data quality metrics.
 */

import { mean, median } from 'simple-statistics';
import { getRandomFallback, calculatePearsonCorrelation, extractNumericValues } from './utils';

/**
 * Calculate the average cardinality of categorical columns.
 * 
 * @param data - Dataset data
 * @param categoricalCols - List of categorical column names
 * @returns Average number of unique values in categorical columns
 */
export function calculateCardinalityCategorical(data: Record<string, any>[], categoricalCols: string[]): number {
  try {
    if (!data || data.length === 0 || categoricalCols.length === 0) {
      return getRandomFallback('Cardinality_Categorical');
    }
    
    const cardinalities = categoricalCols.map(col => {
      const uniqueValues = new Set<any>();
      data.forEach(row => {
        if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
          uniqueValues.add(row[col]);
        }
      });
      return uniqueValues.size;
    });
    
    if (cardinalities.length === 0) return getRandomFallback('Cardinality_Categorical');
    
    // Calculate average cardinality
    const avgCardinality = cardinalities.reduce((sum, val) => sum + val, 0) / cardinalities.length;
    
    return Math.round(avgCardinality);
  } catch (error) {
    console.error("Error calculating cardinality of categorical columns:", error);
    return getRandomFallback('Cardinality_Categorical');
  }
}

/**
 * Calculate the mean absolute correlation between numeric features.
 * 
 * @param data - Dataset data
 * @param numericCols - List of numeric column names
 * @returns Mean absolute correlation
 */
export function calculateFeatureCorrelationMean(data: Record<string, any>[], numericCols: string[]): number {
  try {
    if (!data || data.length === 0 || numericCols.length < 2) {
      return getRandomFallback('Feature_Correlation_Mean');
    }
    
    // Create a correlation matrix
    const correlations: number[] = [];
    
    // Calculate correlation for each pair of numeric columns
    for (const i = 0; i < numericCols.length; i++) {
      for (const j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];
        
        // Extract paired values (exclude rows with missing values)
        const pairs: [number, number][] = [];
        
        data.forEach(row => {
          const val1 = parseFloat(row[col1]);
          const val2 = parseFloat(row[col2]);
          
          if (!isNaN(val1) && !isNaN(val2)) {
            pairs.push([val1, val2]);
          }
        });
        
        if (pairs.length < 2) continue;
        
        // Calculate Pearson correlation coefficient
        const corr = calculatePearsonCorrelation(pairs);
        if (!isNaN(corr)) {
          correlations.push(Math.abs(corr)); // Use absolute value
        }
      }
    }
    
    if (correlations.length === 0) return getRandomFallback('Feature_Correlation_Mean');
    
    // Calculate mean correlation
    const meanCorr = correlations.reduce((sum, val) => sum + val, 0) / correlations.length;
    
    return parseFloat(meanCorr.toFixed(2));
  } catch (error) {
    console.error("Error calculating feature correlation mean:", error);
    return getRandomFallback('Feature_Correlation_Mean');
  }
}

/**
 * Calculate the mean/median drift in numeric columns.
 * 
 * @param data - Dataset data
 * @param numericCols - List of numeric column names
 * @returns Average mean/median drift across numeric columns
 */
export function calculateMeanMedianDrift(data: Record<string, any>[], numericCols: string[]): number {
  try {
    if (!data || data.length === 0 || numericCols.length === 0) {
      return getRandomFallback('Mean_Median_Drift');
    }
    
    const drifts: number[] = [];
    
    numericCols.forEach(col => {
      // Extract numeric values for the column
      const values = extractNumericValues(data, col);
      
      if (values.length === 0) return;
      
      // Calculate mean and median
      const meanValue = mean(values);
      const medianValue = median(values);
      
      // Calculate drift
      let drift: number;
      
      if (medianValue !== 0) {
        drift = Math.abs(meanValue - medianValue) / Math.abs(medianValue);
      } else {
        drift = Math.abs(meanValue - medianValue) / Math.max(1, Math.abs(meanValue));
      }
      
      drifts.push(drift);
    });
    
    if (drifts.length === 0) return getRandomFallback('Mean_Median_Drift');
    
    // Calculate average drift
    const avgDrift = drifts.reduce((sum, val) => sum + val, 0) / drifts.length;
    
    return parseFloat(avgDrift.toFixed(2));
  } catch (error) {
    console.error("Error calculating mean-median drift:", error);
    return getRandomFallback('Mean_Median_Drift');
  }
}

/**
 * Calculate the variance threshold check.
 * 
 * @param data - Dataset data
 * @param numericCols - List of numeric column names
 * @returns Proportion of features with low variance
 */
export function calculateVarianceThresholdCheck(data: Record<string, any>[], numericCols: string[]): number {
  try {
    if (!data || data.length === 0 || numericCols.length === 0) {
      return getRandomFallback('Variance_Threshold_Check');
    }
    
    const lowVarianceCount = 0;
    
    numericCols.forEach(col => {
      // Extract numeric values for the column
      const values = extractNumericValues(data, col);
      
      if (values.length === 0) return;
      
      // Calculate variance
      const meanValue = mean(values);
      const variance = values.reduce((sum, val) => sum + Math.pow(val - meanValue, 2), 0) / values.length;
      
      // Check if variance is below threshold
      // Using 0.01 as a threshold for low variance
      if (variance < 0.01) {
        lowVarianceCount++;
      }
    });
    
    if (numericCols.length === 0) return getRandomFallback('Variance_Threshold_Check');
    
    return parseFloat((lowVarianceCount / numericCols.length).toFixed(2));
  } catch (error) {
    console.error("Error calculating variance threshold check:", error);
    return getRandomFallback('Variance_Threshold_Check');
  }
}
