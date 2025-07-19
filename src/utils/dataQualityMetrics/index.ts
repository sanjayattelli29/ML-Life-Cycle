/**
 * Data Quality Metrics
 * 
 * This module provides a comprehensive set of functions for calculating data quality metrics.
 * It combines basic, statistical, and advanced metrics to provide a complete picture of data quality.
 */

// Export types
export * from './types';

// Export utility functions
export * from './utils';

// Export metrics calculation functions
export * from './basicMetrics';
export * from './statisticalMetrics';
export * from './advancedMetrics';
export * from './scoring';

import { Dataset, QualityMetric, metricDefinitions } from './types';
import { detectColumnTypes, formatMetricValue } from './utils';

// Import basic metrics
import {
  calculateMissingValuesPct,
  calculateDuplicateRecordsCount,
  calculateOutlierRate,
  calculateInconsistencyRate,
  calculateDataTypeMismatchRate,
  calculateRangeViolationRate,
  calculateDomainConstraintViolations
} from './basicMetrics';

// Import statistical metrics
import {
  calculateCardinalityCategorical,
  calculateFeatureCorrelationMean,
  calculateMeanMedianDrift,
  calculateVarianceThresholdCheck
} from './statisticalMetrics';

// Import advanced metrics
import {
  calculateTargetImbalance,
  calculateClassOverlapScore,
  calculateLabelNoiseRate,
  calculateDataFreshness,
  calculateAnomalyCount,
  calculateEncodingCoverageRate,
  calculateDataDensityCompleteness,
  calculateFeatureImportanceConsistency
} from './advancedMetrics';

// Import scoring
import { calculateDataQualityScore } from './scoring';

/**
 * Calculate all metrics for a dataset.
 * 
 * @param dataset - Dataset object
 * @returns Record of calculated metrics
 */
export function calculateAllMetrics(dataset: Dataset): Record<string, number | string> {
  if (!dataset || !dataset.data || !dataset.columns) {
    return {};
  }
  
  const { data, columns } = dataset;
  const { numericCols, categoricalCols, dateCols } = detectColumnTypes(data, columns);
  
  // Calculate basic metrics
  const rowCount = data.length;
  const columnCount = columns.length;
  const numericColumnsCount = numericCols.length;
  const categoricalColumnsCount = categoricalCols.length;
  const dateColumnsCount = dateCols.length;
  
  // Calculate file size (estimated)
  const fileSizeMB = parseFloat(((rowCount * columnCount * 10) / 1024 / 1024).toFixed(2));
  
  // Calculate data quality metrics
  const missingValuesPct = calculateMissingValuesPct(data);
  const duplicateRecordsCount = calculateDuplicateRecordsCount(data);
  const outlierRate = calculateOutlierRate(data, numericCols);
  const inconsistencyRate = calculateInconsistencyRate(data, columns);
  const dataTypeMismatchRate = calculateDataTypeMismatchRate(data, columns);
  const nullVsNaNDistribution = 0.5; // Simplified implementation
  const rangeViolationRate = calculateRangeViolationRate(data, numericCols);
  const domainConstraintViolations = calculateDomainConstraintViolations(data, columns);
  
  // Calculate statistical metrics
  const cardinalityCategorical = calculateCardinalityCategorical(data, categoricalCols);
  const featureCorrelationMean = calculateFeatureCorrelationMean(data, numericCols);
  const meanMedianDrift = calculateMeanMedianDrift(data, numericCols);
  const varianceThresholdCheck = calculateVarianceThresholdCheck(data, numericCols);
  
  // Calculate advanced metrics
  // Assume the target column is the last column for simplicity
  const targetColumn = columns.length > 0 ? columns[columns.length - 1].name : undefined;
  
  const targetImbalance = calculateTargetImbalance(data, targetColumn);
  const classOverlapScore = calculateClassOverlapScore(data, numericCols, targetColumn);
  const labelNoiseRate = calculateLabelNoiseRate(data, numericCols, targetColumn);
  const featureImportanceConsistency = calculateFeatureImportanceConsistency(data, numericCols, targetColumn);
  const dataFreshness = calculateDataFreshness(data, dateCols);
  const anomalyCount = calculateAnomalyCount(data, numericCols);
  const encodingCoverageRate = calculateEncodingCoverageRate(data, categoricalCols);
  const dataDensityCompleteness = calculateDataDensityCompleteness(data);
  
  // Calculate overall data quality score
  const metricsForScore = {
    'Missing_Values_Pct': missingValuesPct,
    'Duplicate_Records_Count': duplicateRecordsCount,
    'Outlier_Rate': outlierRate,
    'Inconsistency_Rate': inconsistencyRate,
    'Data_Type_Mismatch_Rate': dataTypeMismatchRate,
    'Feature_Correlation_Mean': featureCorrelationMean,
    'Range_Violation_Rate': rangeViolationRate,
    'Mean_Median_Drift': meanMedianDrift,
    'Cardinality_Categorical': cardinalityCategorical
  };
  
  const dataQualityScore = calculateDataQualityScore(metricsForScore);
  
  return {
    // Data Structure metrics
    'Row_Count': rowCount,
    'Column_Count': columnCount,
    'File_Size_MB': fileSizeMB,
    'Numeric_Columns_Count': numericColumnsCount,
    'Categorical_Columns_Count': categoricalColumnsCount,
    'Date_Columns_Count': dateColumnsCount,
    
    // Data Quality metrics
    'Missing_Values_Pct': missingValuesPct,
    'Duplicate_Records_Count': duplicateRecordsCount,
    'Outlier_Rate': outlierRate,
    'Inconsistency_Rate': inconsistencyRate,
    'Data_Type_Mismatch_Rate': dataTypeMismatchRate,
    'Null_vs_NaN_Distribution': nullVsNaNDistribution,
    'Range_Violation_Rate': rangeViolationRate,
    'Domain_Constraint_Violations': domainConstraintViolations,
    
    // Statistical metrics
    'Feature_Correlation_Mean': featureCorrelationMean,
    'Mean_Median_Drift': meanMedianDrift,
    'Cardinality_Categorical': cardinalityCategorical,
    'Variance_Threshold_Check': varianceThresholdCheck,
    
    // Advanced metrics
    'Target_Imbalance': targetImbalance,
    'Feature_Importance_Consistency': featureImportanceConsistency,
    'Class_Overlap_Score': classOverlapScore,
    'Label_Noise_Rate': labelNoiseRate,
    'Data_Freshness': dataFreshness,
    'Anomaly_Count': anomalyCount,
    'Encoding_Coverage_Rate': encodingCoverageRate,
    'Data_Density_Completeness': dataDensityCompleteness,
    
    // Overall score
    'Data_Quality_Score': dataQualityScore
  };
}

/**
 * Get all metrics formatted as QualityMetric objects.
 * 
 * @param dataset - Dataset object
 * @returns Array of QualityMetric objects
 */
export function getAllMetrics(dataset: Dataset): QualityMetric[] {
  const rawMetrics = calculateAllMetrics(dataset);
  
  return Object.entries(rawMetrics).map(([name, value]) => {
    const definition = metricDefinitions[name] || {
      description: `Metric ${name}`,
      category: 'data_quality',
      scoreImpact: 'positive'
    };
    
    return {
      name,
      value: formatMetricValue(value as number, name),
      description: definition.description,
      category: definition.category,
      scoreImpact: definition.scoreImpact
    };
  });
}
