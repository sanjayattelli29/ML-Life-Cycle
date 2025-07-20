export interface QualityMetric {
  name: string;
  score: number;
  details?: Record<string, unknown>;
}

export interface MetricProcessor {
  canProcess: (metric: QualityMetric) => boolean;
  process: (data: unknown[], metric: QualityMetric) => Promise<unknown[]>;
}

export const metricProcessorRegistry: Record<string, MetricProcessor> = {
  'Data_Freshness': {
    canProcess: (metric) => metric.name === 'Data_Freshness' && metric.score < 80,
    process: async (data) => data
  },
  'Anomaly_Count': {
    canProcess: (metric) => metric.name === 'Anomaly_Count' && metric.score < 80,
    process: async (data) => data
  },
  'Encoding_Coverage_Rate': {
    canProcess: (metric) => metric.name === 'Encoding_Coverage_Rate' && metric.score < 85,
    process: async (data) => data
  },
  'Variance_Threshold_Check': {
    canProcess: (metric) => metric.name === 'Variance_Threshold_Check' && metric.score < 85,
    process: async (data) => data
  },
  'Data_Density_Completeness': {
    canProcess: (metric) => metric.name === 'Data_Density_Completeness' && metric.score < 85,
    process: async (data) => data
  },
  'Domain_Constraint_Violations': {
    canProcess: (metric) => metric.name === 'Domain_Constraint_Violations' && metric.score < 85,
    process: async (data) => data
  }
};

/**
 * Automatically removes highly correlated and low-variance features from a dataset.
 * @param dataset The dataset object with columns and data.
 * @param correlationThreshold Correlation threshold (default 0.8)
 * @param varianceThreshold Variance threshold (default 0.0)
 * @returns Processed dataset with redundant features removed.
 */
export function autoRemoveRedundantFeatures(
  dataset: {
    columns: { name: string; type: 'numeric' | 'text' | 'date' }[];
    data: Record<string, string | number>[];
  },
  correlationThreshold = 0.8,
  varianceThreshold = 0.0
) {
  // Helper: Pearson correlation
  function calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Helper: Variance
  function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  // 1. Remove low-variance features
  const numericColumns = dataset.columns.filter(col => col.type === 'numeric');
  const lowVarianceCols = new Set<string>();
  for (const col of numericColumns) {
    const values = dataset.data.map(row => Number(row[col.name])).filter(val => !isNaN(val));
    const variance = calculateVariance(values);
    if (variance <= varianceThreshold) {
      lowVarianceCols.add(col.name);
    }
  }

  // 2. Remove highly correlated features (keep only one of each correlated pair)
  const columnsToRemove = new Set<string>(lowVarianceCols);
  const remainingCols = numericColumns.map(col => col.name).filter(name => !lowVarianceCols.has(name));
  const alreadyRemoved = new Set<string>();
  for (let i = 0; i < remainingCols.length; i++) {
    for (let j = i + 1; j < remainingCols.length; j++) {
      const col1 = remainingCols[i];
      const col2 = remainingCols[j];
      if (alreadyRemoved.has(col2)) continue;
      const values1 = dataset.data.map(row => Number(row[col1])).filter(val => !isNaN(val));
      const values2 = dataset.data.map(row => Number(row[col2])).filter(val => !isNaN(val));
      if (values1.length === values2.length && values1.length > 0) {
        const correlation = Math.abs(calculateCorrelation(values1, values2));
        if (correlation >= correlationThreshold) {
          columnsToRemove.add(col2); // Always remove the second column
          alreadyRemoved.add(col2);
        }
      }
    }
  }

  // 3. Remove columns from columns and data
  const newColumns = dataset.columns.filter(col => !columnsToRemove.has(col.name));
  const newData = dataset.data.map(row => {
    const newRow = { ...row };
    columnsToRemove.forEach(col => delete newRow[col]);
    return newRow;
  });

  return {
    ...dataset,
    columns: newColumns,
    data: newData,
    removedColumns: Array.from(columnsToRemove),
  };
}
