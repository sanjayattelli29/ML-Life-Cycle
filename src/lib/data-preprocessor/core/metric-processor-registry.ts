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
