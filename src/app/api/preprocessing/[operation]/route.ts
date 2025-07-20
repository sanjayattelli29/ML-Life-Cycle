import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { autoRemoveRedundantFeatures } from '../../../../lib/data-preprocessor/core/metric-processor-registry';

interface Column {
  name: string;
  type: 'numeric' | 'text' | 'date';
}

interface Dataset {
  _id: string;
  name: string;
  columns: Column[];
  data: Record<string, string | number | null>[];
}

type DataRow = Record<string, string | number | null>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operation: string }> }
) {
  try {
    const { dataset } = await request.json();
    const { operation } = await params;

    // Process the dataset based on the operation
    let processedDataset = { ...dataset };
    
    switch (operation) {
      case 'missing-values':
        processedDataset = await handleMissingValues(processedDataset);
        break;
      case 'outliers':
        processedDataset = await handleOutliers(processedDataset);
        break;
      case 'data-type-mismatch':
        processedDataset = await handleDataTypeMismatch(processedDataset);
        break;
      case 'duplicate-records':
        processedDataset = await handleDuplicateRecords(processedDataset);
        break;
      case 'feature-correlation':
        processedDataset = await handleFeatureCorrelation(processedDataset);
        break;
      case 'inconsistencies':
        processedDataset = await handleInconsistencies(processedDataset);
        break;
      case 'low-variance':
        processedDataset = await handleLowVariance(processedDataset);
        break;
      case 'mean-median-drift':
        processedDataset = await handleMeanMedianDrift(processedDataset);
        break;
      case 'range-violations':
        processedDataset = await handleRangeViolations(processedDataset);
        break;
      case 'target-imbalance':
        processedDataset = await handleTargetImbalance(processedDataset);
        break;
      default:
        throw new Error(`Unsupported preprocessing operation: ${operation}`);
    }

    return NextResponse.json({ dataset: processedDataset });
  } catch (error) {
    console.error('Error in preprocessing:', error);
    return NextResponse.json(
      { error: 'Failed to process dataset' },
      { status: 500 }
    );
  }
}

async function handleMissingValues(dataset: Dataset): Promise<Dataset> {
  const processedData = dataset.data.map(row => {
    const newRow = { ...row };
    for (const column of dataset.columns) {
      if (newRow[column.name] === null || newRow[column.name] === undefined || newRow[column.name] === '') {
        if (column.type === 'numeric') {
          // Calculate mean for numeric columns
          const values = dataset.data
            .map(r => r[column.name])
            .filter(val => val !== null && val !== undefined && val !== '')
            .map(Number);
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          newRow[column.name] = mean;
        } else {
          // Use mode for non-numeric columns
          const frequency: { [key: string]: number } = {};
          let mode = '';
          let maxCount = 0;
          
          dataset.data.forEach(r => {
            const value = String(r[column.name]);
            if (value && value !== 'null' && value !== 'undefined') {
              frequency[value] = (frequency[value] || 0) + 1;
              if (frequency[value] > maxCount) {
                maxCount = frequency[value];
                mode = value;
              }
            }
          });
          
          newRow[column.name] = mode || 'Unknown';
        }
      }
    }
    return newRow;
  });

  return { ...dataset, data: processedData };
}

async function handleOutliers(dataset: Dataset): Promise<Dataset> {
  const processedData = dataset.data.map(row => {
    const newRow = { ...row };
    for (const column of dataset.columns) {
      if (column.type === 'numeric') {
        const values = dataset.data
          .map(r => Number(r[column.name]))
          .filter(val => !isNaN(val));

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(
          values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
        );

        const value = Number(newRow[column.name]);
        if (!isNaN(value) && Math.abs(value - mean) > 3 * std) {
          newRow[column.name] = mean;
        }
      }
    }
    return newRow;
  });

  return { ...dataset, data: processedData };
}

async function handleDataTypeMismatch(dataset: Dataset): Promise<Dataset> {
  const processedData = dataset.data.map(row => {
    const newRow = { ...row };
    for (const column of dataset.columns) {
      const value = newRow[column.name];
      if (value === null || value === undefined) continue;

      if (column.type === 'numeric') {
        const numValue = Number(value);
        newRow[column.name] = isNaN(numValue) ? 0 : numValue;
      } else if (column.type === 'text') {
        newRow[column.name] = String(value);
      } else if (column.type === 'date') {
        const date = new Date(value);
        newRow[column.name] = isNaN(date.getTime()) ? null : date.toISOString();
      }
    }
    return newRow;
  });

  return { ...dataset, data: processedData };
}

async function handleDuplicateRecords(dataset: Dataset): Promise<Dataset> {
  const seen = new Set<string>();
  const processedData = dataset.data.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { ...dataset, data: processedData };
}

async function handleFeatureCorrelation(dataset: Dataset): Promise<Dataset> {
  // Automatically remove both highly correlated and low-variance features
  const processed = autoRemoveRedundantFeatures(dataset);
  return {
    ...dataset,
    columns: processed.columns,
    data: processed.data,
    // removedColumns: processed.removedColumns, // Omit if not in Dataset type
  };
}

async function handleInconsistencies(dataset: Dataset): Promise<Dataset> {
  const processedData = dataset.data.map((row: DataRow) => {
    const newRow = { ...row };
    for (const column of dataset.columns) {
      const value = newRow[column.name];
      if (value === null || value === undefined) continue;

      // Standardize text format
      if (column.type === 'text') {
        newRow[column.name] = String(value).trim();
      }
      // Standardize date format
      else if (column.type === 'date') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            newRow[column.name] = date.toISOString().split('T')[0];
          }
        } catch {
          // Keep original if parsing fails
        }
      }
    }
    return newRow;
  });

  return { ...dataset, data: processedData };
}

async function handleLowVariance(dataset: Dataset): Promise<Dataset> {
  // Use the same logic as feature correlation for unified redundant feature removal
  const processed = autoRemoveRedundantFeatures(dataset);
  return {
    ...dataset,
    columns: processed.columns,
    data: processed.data,
    // removedColumns: processed.removedColumns, // Omit if not in Dataset type
  };
}

async function handleMeanMedianDrift(dataset: Dataset): Promise<Dataset> {
  const processedData = dataset.data.map((row: DataRow) => {
    const newRow = { ...row };
    for (const column of dataset.columns) {
      if (column.type !== 'numeric') continue;

      const values = dataset.data
        .map(r => Number(r[column.name]))
        .filter((val): val is number => !isNaN(val))
        .sort((a, b) => a - b);

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const median = values[Math.floor(values.length / 2)];
      const drift = Math.abs((mean - median) / median);

      // If drift is significant, adjust extreme values
      if (drift > 0.2) { // Adjust threshold as needed
        const value = Number(newRow[column.name]);
        if (!isNaN(value)) {
          if (value > mean + 2 * (mean - median)) {
            newRow[column.name] = mean + 2 * (mean - median);
          } else if (value < mean - 2 * (mean - median)) {
            newRow[column.name] = mean - 2 * (mean - median);
          }
        }
      }
    }
    return newRow;
  });

  return { ...dataset, data: processedData };
}

async function handleRangeViolations(dataset: Dataset): Promise<Dataset> {
  const processedData = dataset.data.map((row: DataRow) => {
    const newRow = { ...row };
    for (const column of dataset.columns) {
      if (column.type !== 'numeric') continue;

      const values = dataset.data
        .map(r => Number(r[column.name]))
        .filter((val): val is number => !isNaN(val));

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const lowerBound = min - 0.1 * range;
      const upperBound = max + 0.1 * range;

      const value = Number(newRow[column.name]);
      if (!isNaN(value)) {
        if (value < lowerBound) {
          newRow[column.name] = lowerBound;
        } else if (value > upperBound) {
          newRow[column.name] = upperBound;
        }
      }
    }
    return newRow;
  });

  return { ...dataset, data: processedData };
}

async function handleTargetImbalance(dataset: Dataset): Promise<Dataset> {
  const targetColumn = dataset.columns.find((col: Column) => 
    col.name.toLowerCase().includes('target')
  );
  if (!targetColumn) return dataset;

  const valueFrequency: { [key: string]: number } = {};
  dataset.data.forEach((row: DataRow) => {
    const value = String(row[targetColumn.name]);
    valueFrequency[value] = (valueFrequency[value] || 0) + 1;
  });

  const maxFrequency = Math.max(...Object.values(valueFrequency));
  const processedData = [...dataset.data];

  // Oversample minority classes
  Object.entries(valueFrequency).forEach(([value, freq]) => {
    if (freq < maxFrequency) {
      const samplesNeeded = maxFrequency - freq;
      const samplesOfClass = dataset.data.filter((row: DataRow) => 
        String(row[targetColumn.name]) === value
      );

      for (let i = 0; i < samplesNeeded; i++) {
        const randomSample = samplesOfClass[Math.floor(Math.random() * samplesOfClass.length)];
        processedData.push({ ...randomSample });
      }
    }
  });

  return { ...dataset, data: processedData };
}
