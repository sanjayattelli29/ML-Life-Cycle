// Task Type Inference Utility
// Determines if a ML task should be classification or regression based on target column

export interface TaskInferenceResult {
  taskType: 'classification' | 'regression';
  modelVariant: string;
  explanation: string;
  confidence: number;
}

export interface TargetAnalysis {
  uniqueCount: number;
  uniqueValues: string[];
  totalSamples: number;
  missingCount: number;
  missingPercentage: number;
  isNumeric: boolean;
  isInteger: boolean;
  valueDistribution: Record<string, number>;
  isImbalanced: boolean;
  imbalanceRatio: number;
  dataQuality: 'Good' | 'Fair' | 'Poor';
}

export interface ModelVariants {
  [key: string]: {
    classification: string;
    regression: string;
  };
}

// Model variants mapping
const MODEL_VARIANTS: ModelVariants = {
  'random_forest': {
    classification: 'RandomForestClassifier',
    regression: 'RandomForestRegressor'
  },
  'xgboost_model': {
    classification: 'XGBClassifier', 
    regression: 'XGBRegressor'
  },
  'xgboost': {
    classification: 'XGBClassifier',
    regression: 'XGBRegressor'
  },
  'svm': {
    classification: 'SVC',
    regression: 'SVR'
  },
  'logistic_regression': {
    classification: 'LogisticRegression',
    regression: 'LinearRegression' // Fallback to linear regression
  },
  'linear_regression': {
    classification: 'LogisticRegression', // Fallback to logistic regression
    regression: 'LinearRegression'
  }
};

export const inferTaskTypeFromPreview = (
  targetColumn: string,
  dataPreview: { headers: string[]; rows: string[][] },
  modelName: string
): TaskInferenceResult => {
  
  // Find target column index
  const targetIndex = dataPreview.headers.indexOf(targetColumn);
  if (targetIndex === -1) {
    throw new Error(`Target column '${targetColumn}' not found in dataset`);
  }

  // Extract target column values
  const targetValues = dataPreview.rows.map(row => row[targetIndex]).filter(val => val !== null && val !== undefined && val !== '');
  
  // Get unique values
  const uniqueValues = [...new Set(targetValues)];
  const uniqueCount = uniqueValues.length;
  
  // Analyze data characteristics
  const isNumeric = targetValues.every(val => !isNaN(Number(val)) && val !== '');
  const isInteger = isNumeric && targetValues.every(val => Number.isInteger(Number(val)));
  const isCategorical = !isNumeric || uniqueValues.some(val => isNaN(Number(val)));
  
  // Decision logic
  let taskType: 'classification' | 'regression';
  let confidence = 0.8;
  let reasoning = '';

  if (isCategorical) {
    // Categorical data (strings, mixed types) = Classification
    taskType = 'classification';
    confidence = 0.95;
    reasoning = `categorical data with values like [${uniqueValues.slice(0, 3).join(', ')}${uniqueValues.length > 3 ? '...' : ''}]`;
  } else if (uniqueCount <= 10) {
    // Few unique numeric values = Classification  
    taskType = 'classification';
    confidence = 0.9;
    reasoning = `only ${uniqueCount} unique values [${uniqueValues.slice(0, 5).join(', ')}${uniqueValues.length > 5 ? '...' : ''}]`;
  } else if (isInteger && uniqueCount <= 20) {
    // Limited integer range = Classification
    taskType = 'classification';
    confidence = 0.85;
    reasoning = `integer values with ${uniqueCount} unique classes`;
  } else if (isNumeric && uniqueCount > 20) {
    // Many unique numeric values = Regression
    taskType = 'regression';
    confidence = 0.9;
    reasoning = `continuous numeric data with ${uniqueCount} unique values`;
  } else {
    // Default fallback
    taskType = uniqueCount <= 15 ? 'classification' : 'regression';
    confidence = 0.7;
    reasoning = `${uniqueCount} unique values, defaulting to ${taskType}`;
  }

  // Get model variant
  const modelVariant = getModelVariant(modelName, taskType);
  
  // Generate explanation
  const explanation = `Based on your selected target column '${targetColumn}', which contains ${reasoning}, this task is treated as **${taskType}**. Therefore, we'll use **${modelVariant}**.`;

  return {
    taskType,
    modelVariant,
    explanation,
    confidence
  };
};

export const getModelVariant = (modelName: string, taskType: 'classification' | 'regression'): string => {
  const variants = MODEL_VARIANTS[modelName.toLowerCase()];
  
  if (!variants) {
    // Fallback for unknown models
    return `${modelName}_${taskType}`;
  }
  
  return variants[taskType];
};

// Enhanced function that also analyzes data quality
export const analyzeTargetColumn = (
  targetColumn: string,
  dataPreview: { headers: string[]; rows: string[][] }
): TargetAnalysis => {
  const targetIndex = dataPreview.headers.indexOf(targetColumn);
  if (targetIndex === -1) {
    throw new Error(`Target column '${targetColumn}' not found in dataset`);
  }

  const targetValues = dataPreview.rows.map(row => row[targetIndex]);
  const nonEmptyValues = targetValues.filter(val => val !== null && val !== undefined && val !== '');
  
  const uniqueValues = [...new Set(nonEmptyValues)];
  const missingCount = targetValues.length - nonEmptyValues.length;
  const missingPercentage = (missingCount / targetValues.length) * 100;
  
  const isNumeric = nonEmptyValues.every(val => !isNaN(Number(val)) && val !== '');
  const isInteger = isNumeric && nonEmptyValues.every(val => Number.isInteger(Number(val)));
  
  // Value distribution analysis
  const valueDistribution = uniqueValues.reduce((acc, value) => {
    acc[value] = nonEmptyValues.filter(v => v === value).length;
    return acc;
  }, {} as Record<string, number>);
  
  // Check for class imbalance (classification)
  const maxCount = Math.max(...Object.values(valueDistribution));
  const minCount = Math.min(...Object.values(valueDistribution));
  const imbalanceRatio = maxCount / minCount;
  
  return {
    uniqueCount: uniqueValues.length,
    uniqueValues: uniqueValues.slice(0, 10), // First 10 unique values
    totalSamples: targetValues.length,
    missingCount,
    missingPercentage,
    isNumeric,
    isInteger,
    valueDistribution,
    isImbalanced: imbalanceRatio > 3, // Flag if classes are imbalanced
    imbalanceRatio,
    dataQuality: missingPercentage < 5 ? 'Good' : missingPercentage < 15 ? 'Fair' : 'Poor'
  };
};

// Function to suggest optimal data split based on task type and data size
export const suggestDataSplit = (
  taskType: 'classification' | 'regression',
  totalSamples: number,
  uniqueClasses?: number
) => {
  let trainRatio = 0.8;
  let testRatio = 0.2;
  let validationRatio = 0.0;
  
  // Adjust based on dataset size
  if (totalSamples < 1000) {
    // Small dataset - no validation split
    trainRatio = 0.8;
    testRatio = 0.2;
  } else if (totalSamples < 10000) {
    // Medium dataset - small validation split
    trainRatio = 0.7;
    testRatio = 0.2;
    validationRatio = 0.1;
  } else {
    // Large dataset - standard split
    trainRatio = 0.6;
    testRatio = 0.2;
    validationRatio = 0.2;
  }
  
  // For classification with many classes, ensure enough samples per class
  if (taskType === 'classification' && uniqueClasses && uniqueClasses > 5) {
    const samplesPerClass = totalSamples / uniqueClasses;
    if (samplesPerClass < 50) {
      // Reduce validation split for datasets with many classes and few samples per class
      trainRatio = 0.8;
      testRatio = 0.2;
      validationRatio = 0.0;
    }
  }
  
  return {
    train: trainRatio,
    test: testRatio,
    validation: validationRatio,
    reasoning: `Recommended split for ${taskType} task with ${totalSamples.toLocaleString()} samples`
  };
};
