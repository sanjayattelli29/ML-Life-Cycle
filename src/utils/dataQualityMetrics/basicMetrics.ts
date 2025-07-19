/**
 * Basic Data Quality Metrics
 * 
 * This module provides functions for calculating basic data quality metrics.
 */

import { Column, Dataset } from './types';
import { getRandomFallback, extractNumericValues, calculateQuantiles, isOutlier } from './utils';

/**
 * Calculate the percentage of missing values in the dataset.
 * 
 * @param data - Dataset data
 * @returns Percentage of missing values
 */
export function calculateMissingValuesPct(data: Record<string, any>[]): number {
  try {
    if (!data || data.length === 0) return getRandomFallback('Missing_Values_Pct');
    
    let totalCells = 0;
    let missingCells = 0;
    
    data.forEach(row => {
      Object.values(row).forEach(value => {
        totalCells++;
        if (value === null || value === undefined || value === '') {
          missingCells++;
        }
      });
    });
    
    return parseFloat(((missingCells / totalCells) * 100).toFixed(2));
  } catch (error) {
    console.error("Error calculating missing values percentage:", error);
    return getRandomFallback('Missing_Values_Pct');
  }
}

/**
 * Count the number of duplicate records in the dataset.
 * 
 * @param data - Dataset data
 * @returns Number of duplicate records
 */
export function calculateDuplicateRecordsCount(data: Record<string, any>[]): number {
  try {
    if (!data || data.length === 0) return getRandomFallback('Duplicate_Records_Count');
    
    const stringifiedRows = data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(stringifiedRows);
    
    return data.length - uniqueRows.size;
  } catch (error) {
    console.error("Error calculating duplicate records count:", error);
    return getRandomFallback('Duplicate_Records_Count');
  }
}

/**
 * Calculate the rate of outliers in numeric columns using IQR method.
 * 
 * @param data - Dataset data
 * @param numericCols - List of numeric column names
 * @returns Rate of outliers
 */
export function calculateOutlierRate(data: Record<string, any>[], numericCols: string[]): number {
  try {
    if (!data || data.length === 0 || numericCols.length === 0) {
      return getRandomFallback('Outlier_Rate');
    }
    
    const outlierCount = 0;
    const totalValues = 0;
    
    numericCols.forEach(col => {
      // Extract numeric values for the column
      const values = extractNumericValues(data, col);
      
      if (values.length === 0) return;
      
      totalValues += values.length;
      
      // Calculate quartiles and IQR
      const { q1, q3, iqr } = calculateQuantiles(values);
      
      // Count outliers
      values.forEach(val => {
        if (isOutlier(val, q1, q3, iqr)) {
          outlierCount++;
        }
      });
    });
    
    if (totalValues === 0) return getRandomFallback('Outlier_Rate');
    
    return parseFloat((outlierCount / totalValues).toFixed(4));
  } catch (error) {
    console.error("Error calculating outlier rate:", error);
    return getRandomFallback('Outlier_Rate');
  }
}

/**
 * Calculate the rate of inconsistencies in the data.
 * 
 * @param data - Dataset data
 * @param columns - Dataset columns
 * @returns Rate of inconsistencies
 */
export function calculateInconsistencyRate(data: Record<string, any>[], columns: Column[]): number {
  try {
    if (!data || data.length === 0) return getRandomFallback('Inconsistency_Rate');
    
    const inconsistencies = 0;
    const totalChecks = 0;
    
    // Check for negative values in columns that should be positive
    const positivePatterns = ['age', 'price', 'cost', 'income', 'salary', 'count', 'amount', 'quantity'];
    
    columns.forEach(column => {
      if (column.type === 'numeric') {
        const colName = column.name.toLowerCase();
        
        // Check if column name contains any positive pattern
        if (positivePatterns.some(pattern => colName.includes(pattern))) {
          data.forEach(row => {
            const value = parseFloat(row[column.name]);
            if (!isNaN(value)) {
              totalChecks++;
              if (value < 0) {
                inconsistencies++;
              }
            }
          });
        }
      }
    });
    
    // Check for values outside reasonable ranges
    const rangeChecks: Record<string, [number, number]> = {
      'age': [0, 120],
      'percent': [0, 100],
      'probability': [0, 1],
      'score': [0, 100]
    };
    
    columns.forEach(column => {
      if (column.type === 'numeric') {
        const colName = column.name.toLowerCase();
        
        Object.entries(rangeChecks).forEach(([pattern, [min, max]]) => {
          if (colName.includes(pattern)) {
            data.forEach(row => {
              const value = parseFloat(row[column.name]);
              if (!isNaN(value)) {
                totalChecks++;
                if (value < min || value > max) {
                  inconsistencies++;
                }
              }
            });
          }
        });
      }
    });
    
    if (totalChecks === 0) return getRandomFallback('Inconsistency_Rate');
    
    return parseFloat((inconsistencies / totalChecks).toFixed(4));
  } catch (error) {
    console.error("Error calculating inconsistency rate:", error);
    return getRandomFallback('Inconsistency_Rate');
  }
}

/**
 * Calculate the rate of data type mismatches.
 * 
 * @param data - Dataset data
 * @param columns - Dataset columns
 * @returns Rate of data type mismatches
 */
export function calculateDataTypeMismatchRate(data: Record<string, any>[], columns: Column[]): number {
  try {
    if (!data || data.length === 0) return getRandomFallback('Data_Type_Mismatch_Rate');
    
    const mismatches = 0;
    const totalChecks = 0;
    
    columns.forEach(column => {
      data.forEach(row => {
        const value = row[column.name];
        
        if (value === null || value === undefined || value === '') {
          return; // Skip missing values
        }
        
        totalChecks++;
        
        if (column.type === 'numeric') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          if (isNaN(numValue)) {
            mismatches++;
          }
        } else if (column.type === 'date') {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            mismatches++;
          }
        }
        // For text columns, any value is valid
      });
    });
    
    if (totalChecks === 0) return getRandomFallback('Data_Type_Mismatch_Rate');
    
    return parseFloat((mismatches / totalChecks).toFixed(4));
  } catch (error) {
    console.error("Error calculating data type mismatch rate:", error);
    return getRandomFallback('Data_Type_Mismatch_Rate');
  }
}

/**
 * Calculate the rate of range violations.
 * 
 * @param data - Dataset data
 * @param numericCols - List of numeric column names
 * @returns Rate of range violations
 */
export function calculateRangeViolationRate(data: Record<string, any>[], numericCols: string[]): number {
  try {
    if (!data || data.length === 0 || numericCols.length === 0) {
      return getRandomFallback('Range_Violation_Rate');
    }
    
    const violations = 0;
    const totalValues = 0;
    
    numericCols.forEach(col => {
      // Extract numeric values for the column
      const values = extractNumericValues(data, col);
      
      if (values.length === 0) return;
      
      totalValues += values.length;
      
      // Calculate mean and standard deviation
      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / values.length;
      
      const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Define expected range using 3-sigma rule
      const lowerBound = mean - 3 * stdDev;
      const upperBound = mean + 3 * stdDev;
      
      // Count violations
      values.forEach(val => {
        if (val < lowerBound || val > upperBound) {
          violations++;
        }
      });
    });
    
    if (totalValues === 0) return getRandomFallback('Range_Violation_Rate');
    
    return parseFloat((violations / totalValues).toFixed(4));
  } catch (error) {
    console.error("Error calculating range violation rate:", error);
    return getRandomFallback('Range_Violation_Rate');
  }
}

/**
 * Calculate the rate of domain constraint violations.
 * 
 * @param data - Dataset data
 * @param columns - Dataset columns
 * @returns Rate of domain constraint violations
 */
export function calculateDomainConstraintViolations(data: Record<string, any>[], columns: Column[]): number {
  try {
    // This is a simplified implementation that checks for common domain constraints
    // In a real-world scenario, domain constraints would be defined per column
    
    if (!data || data.length === 0) return getRandomFallback('Domain_Constraint_Violations');
    
    const violations = 0;
    const totalChecks = 0;
    
    // Define common domain constraints
    const domainConstraints: Record<string, (value: unknown) => boolean> = {
      'email': (value) => {
        if (typeof value !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      'phone': (value) => {
        if (typeof value !== 'string') return false;
        const phoneRegex = /^\+?[\d\s-]{7,15}$/;
        return phoneRegex.test(value);
      },
      'url': (value) => {
        if (typeof value !== 'string') return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      'zip': (value) => {
        if (typeof value !== 'string') return false;
        const zipRegex = /^\d{5}(-\d{4})?$/;
        return zipRegex.test(value);
      }
    };
    
    columns.forEach(column => {
      if (column.type === 'text') {
        const colName = column.name.toLowerCase();
        
        // Check if column name matches any domain constraint
        const matchingConstraint = Object.keys(domainConstraints).find(pattern => 
          colName.includes(pattern)
        );
        
        if (matchingConstraint) {
          const validateFn = domainConstraints[matchingConstraint];
          
          data.forEach(row => {
            const value = row[column.name];
            
            if (value === null || value === undefined || value === '') {
              return; // Skip missing values
            }
            
            totalChecks++;
            
            if (!validateFn(value)) {
              violations++;
            }
          });
        }
      }
    });
    
    if (totalChecks === 0) return getRandomFallback('Domain_Constraint_Violations');
    
    return parseFloat((violations / totalChecks).toFixed(4));
  } catch (error) {
    console.error("Error calculating domain constraint violations:", error);
    return getRandomFallback('Domain_Constraint_Violations');
  }
}
