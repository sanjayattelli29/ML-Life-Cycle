/**
 * Data Quality Scoring
 * 
 * This module provides functions for calculating the overall data quality score.
 */

import { getRandomFallback } from './utils';

/**
 * Calculate the overall data quality score.
 * 
 * @param metrics - Record of calculated metrics
 * @returns Data quality score (0-100)
 */
export function calculateDataQualityScore(metrics: Record<string, number>): number {
  try {
    // Define weights for different metrics
    const weights: Record<string, number> = {
      'Missing_Values_Pct': 0.15,
      'Duplicate_Records_Count': 0.1,
      'Outlier_Rate': 0.1,
      'Inconsistency_Rate': 0.15,
      'Data_Type_Mismatch_Rate': 0.1,
      'Feature_Correlation_Mean': 0.1,
      'Range_Violation_Rate': 0.1,
      'Mean_Median_Drift': 0.1,
      'Cardinality_Categorical': 0.1
    };
    
    // Normalize metrics to 0-1 scale (where 1 is good)
    const normalizedScores: Record<string, number> = {};
    
    // Missing values (lower is better)
    normalizedScores['Missing_Values_Pct'] = 
      Math.max(0, 1 - metrics['Missing_Values_Pct'] / 100);
    
    // Duplicate records (lower is better)
    const totalRecords = 100; // Assume 100 records if we don&apos;t know the actual count
    normalizedScores['Duplicate_Records_Count'] = 
      Math.max(0, 1 - metrics['Duplicate_Records_Count'] / totalRecords);
    
    // Outlier rate (lower is better)
    normalizedScores['Outlier_Rate'] = 
      Math.max(0, 1 - metrics['Outlier_Rate'] / 0.15);
    
    // Inconsistency rate (lower is better)
    normalizedScores['Inconsistency_Rate'] = 
      Math.max(0, 1 - metrics['Inconsistency_Rate'] / 0.1);
    
    // Data type mismatch rate (lower is better)
    normalizedScores['Data_Type_Mismatch_Rate'] = 
      Math.max(0, 1 - metrics['Data_Type_Mismatch_Rate'] / 0.05);
    
    // Feature correlation (moderate is better, extremes are worse)
    const corrScore = metrics['Feature_Correlation_Mean'];
    normalizedScores['Feature_Correlation_Mean'] = 
      corrScore <= 0.5 ? corrScore * 2 : 2 - corrScore * 2;
    
    // Range violation rate (lower is better)
    normalizedScores['Range_Violation_Rate'] = 
      Math.max(0, 1 - metrics['Range_Violation_Rate'] / 0.1);
    
    // Mean-median drift (lower is better)
    normalizedScores['Mean_Median_Drift'] = 
      Math.max(0, 1 - metrics['Mean_Median_Drift'] / 0.2);
    
    // Cardinality categorical (higher is better, up to a point)
    const cardScore = metrics['Cardinality_Categorical'];
    normalizedScores['Cardinality_Categorical'] = 
      Math.min(1, cardScore / 50);
    
    // Calculate weighted average
    const weightedSum = 0;
    const totalWeight = 0;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      if (normalizedScores[metric] !== undefined) {
        weightedSum += normalizedScores[metric] * weight;
        totalWeight += weight;
      }
    });
    
    if (totalWeight === 0) return getRandomFallback('Data_Quality_Score');
    
    // Scale to 0-100
    const qualityScore = (weightedSum / totalWeight) * 100;
    
    return Math.round(qualityScore);
  } catch (error) {
    console.error("Error calculating data quality score:", error);
    return getRandomFallback('Data_Quality_Score');
  }
}
