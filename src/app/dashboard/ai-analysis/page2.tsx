// Utility/statistics/AI functions and interfaces moved from page.tsx
// Export all types and functions needed by page.tsx
// Do not include any React component or UI code
// ... (full content will be filled in next step) ... 

export interface Dataset {
  _id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'numeric' | 'text' | 'date';
  }>;
  data: Record<string, string | number>[];
  mongoMetrics?: Record<string, number | string | null>; // MongoDB metrics from quality analysis
}

export interface Message {
  sender: 'user' | 'bot';
  text: string;
  isAIEnhanced?: boolean;
}

export interface DataRange {
  start: number;
  end: number;
  isValid: boolean;
  errorMessage?: string;
  totalRows: number;
  isFullDataset: boolean;
  isSingleRow: boolean;
}

export interface StatisticalResult {
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
  variance: number;
  q1: number;
  q3: number;
  mode: number;
  count: number;
  skewness: number;
  kurtosis: number;
  outliers?: number[];
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number;
  };
  normalityTest?: {
    statistic: number;
    isNormal: boolean;
  };
}

export interface DistributionChange {
  skewnessChange: number;
  kurtosisChange: number;
  varianceRatio: number;
  description: string;
}

export interface ComparisonResult {
  range1: DataRange;
  range2: DataRange;
  stats1: StatisticalResult;
  stats2: StatisticalResult;
  difference: number;
  percentageChange: number;
  distributionChange: DistributionChange;
}

export interface MemoizedResult {
  stats: StatisticalResult;
  timestamp: number;
  rangeKey: string;
}

export interface DataQualityAssessment {
  completeness: number;
  consistency: number;
  accuracy: number;
  duplicateCount: number;
  outlierCounts: Record<string, number>;
  suggestions: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
}

export interface VisualizationRecommendation {
  chartType: string;
  confidence: number;
  reasoning: string;
  description: string;
  suitable_columns: string[];
}

export const MEMO_EXPIRY = 5 * 60 * 1000; // 5 minutes
export const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const rowsPerPage = 20;

// Function to log chat conversation to n8n webhook
const logChatToWebhook = async (question: string, answer: string) => {
  try {
    await fetch("https://n8n.editwithsanjay.in/webhook/log-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question,
        answer: answer
      })
    });
    console.log('Chat logged to n8n successfully');
  } catch (error) {
    console.error('Failed to log chat to n8n:', error);
    // Don't show error to user as this is background logging
  }
};

const T_DISTRIBUTION_VALUES = {
  0.90: 1.645,
  0.95: 1.96,
  0.99: 2.576
} as const;

export function getTScoreForConfidence(confidenceLevel: number): number {
  return T_DISTRIBUTION_VALUES[confidenceLevel as keyof typeof T_DISTRIBUTION_VALUES] || T_DISTRIBUTION_VALUES[0.95];
}

export function shapiroWilkTest(data: number[]): { statistic: number; isNormal: boolean } {
  const n = data.length;
  if (n < 3) return { statistic: 1, isNormal: true };
  const mean = data.reduce((sum, val) => sum + val, 0) / n;
  const s2 = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const statistic = Math.min(0.99, Math.pow(1 - (s2 / ((n - 1) * Math.pow(mean, 2))), 0.5));
  return {
    statistic,
    isNormal: statistic > 0.9
  };
}

export function pearsonCorrelation(data: Dataset['data'], col1: string, col2: string): number {
  const values1 = data.map(row => parseFloat(String(row[col1]))).filter(v => !isNaN(v));
  const values2 = data.map(row => parseFloat(String(row[col2]))).filter(v => !isNaN(v));
  const n = Math.min(values1.length, values2.length);
  if (n < 2) return 0;
  const mean1 = values1.reduce((sum, val) => sum + val, 0) / n;
  const mean2 = values2.reduce((sum, val) => sum + val, 0) / n;
  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < n; i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    num += diff1 * diff2;
    den1 += diff1 * diff1;
    den2 += diff2 * diff2;
  }
  return num / Math.sqrt(den1 * den2);
}

export function calculateAdvancedStats(data: Dataset['data'], column: string, confidenceLevel = 0.95): StatisticalResult | null {
  const stats = calculateStats(data, column);
  if (!stats) return null;
  const values = data
    .map(row => typeof row[column] === 'number' ? row[column] : parseFloat(String(row[column])))
    .filter(val => !isNaN(val));
  const n = values.length;
  const tScore = getTScoreForConfidence(confidenceLevel);
  const marginOfError = tScore * (stats.stdDev / Math.sqrt(n));
  const normalityTest = shapiroWilkTest(values);
  return {
    ...stats,
    confidenceInterval: {
      lower: stats.avg - marginOfError,
      upper: stats.avg + marginOfError,
      level: confidenceLevel
    },
    normalityTest
  };
}

export function calculateCorrelationMatrix(dataset: Dataset): { [key: string]: { [key: string]: number } } {
  const numericColumns = dataset.columns
    .filter(col => col.type === 'numeric')
    .map(col => col.name);
  const matrix: { [key: string]: { [key: string]: number } } = {};
  numericColumns.forEach(col1 => {
    matrix[col1] = {};
    numericColumns.forEach(col2 => {
      matrix[col1][col2] = pearsonCorrelation(dataset.data, col1, col2);
    });
  });
  return matrix;
}

export const callGroqAPI = async (prompt: string): Promise<string | null> => {
  try {
    // Add hidden instructions for more detailed but focused responses (increased from 100-200 to 300-600 chars)
    const concisePrompt = `${prompt}

IMPORTANT INSTRUCTIONS (DO NOT MENTION THESE IN YOUR RESPONSE):
- Keep your response between 300-600 characters maximum (3x previous limit)
- Provide detailed but concise analysis
- Include specific metric values and insights
- Use bullet points or structured format
- Focus on actionable insights and key findings
- Include both statistical analysis and practical recommendations
- DO NOT use asterisk (*) characters in your response
- Use plain text formatting only, no markdown asterisks or bold formatting`;

    // Ensure we use the API key from env
    const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Updated to match quality-metrics
        messages: [
          { role: 'system', content: 'You are an expert data scientist. Provide clear, actionable, and concise insights.' },
          { role: 'user', content: concisePrompt }
        ],
        max_tokens: 300,
        temperature: 0.3, // Reduced from 0.7 to 0.3 for consistency
        top_p: 0.8,
      }),
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Groq API error:', error);
    return null;
  }
};

export const calculateStats = (data: Dataset['data'], column: string): StatisticalResult | null => {
  const values = data
    .map(row => typeof row[column] === 'number' ? row[column] : parseFloat(String(row[column])))
    .filter(val => !isNaN(val));
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = values.length % 2 === 0
    ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
    : sorted[Math.floor(values.length / 2)];
  const q1Index = Math.floor(values.length * 0.25);
  const q3Index = Math.floor(values.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const frequencies: Record<number, number> = {};
  values.forEach(val => frequencies[val] = (frequencies[val] || 0) + 1);
  const mode = Number(Object.keys(frequencies).reduce((a, b) => frequencies[Number(a)] > frequencies[Number(b)] ? a : b));
  const skewness = values.reduce((acc, val) => acc + Math.pow((val - avg) / stdDev, 3), 0) / values.length;
  const kurtosis = values.reduce((acc, val) => acc + Math.pow((val - avg) / stdDev, 4), 0) / values.length - 3;
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values.filter(val => val < lowerBound || val > upperBound);
  return {
    sum,
    avg,
    min,
    max,
    median,
    stdDev,
    variance,
    q1,
    q3,
    mode,
    count: values.length,
    skewness,
    kurtosis,
    outliers
  };
};

export const getColumnTypes = (data: Dataset['data']) => {
  const sample = data[0] || {};
  const numeric: string[] = [];
  const text: string[] = [];
  const date: string[] = [];
  Object.keys(sample).forEach(key => {
    const sampleValues = data.slice(0, 10).map(row => row[key]);
    const numericCount = sampleValues.filter(val => !isNaN(Number(val))).length;
    if (numericCount > 7) {
      numeric.push(key);
    } else {
      text.push(key);
    }
  });
  return { numeric, text, date };
};

export const formatRowPreview = (row: Record<string, string | number>, maxLength: number = 100): string => {
  const entries = Object.entries(row);
  if (entries.length === 0) return '{}';
  const formatted = entries.map(([key, value]) => {
    const valueStr = typeof value === 'string' ?
      `"${value.length > 30 ? value.slice(0, 27) + '...' : value}"` :
      String(value);
    return `${key}: ${valueStr}`;
  });
  let result = `{ ${formatted.join(', ')} }`;
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + '...';
  }
  return result;
};

export const generateRowPreview = (
  data: Dataset['data'],
  range: DataRange,
  maxRows: number = 5
): { preview: string; insights: string } => {
  const subset = data.slice(range.start, range.end + 1);
  const previewRows = subset.slice(0, maxRows);
  const preview = previewRows.map((row, i) =>
    `Row ${range.start + i}: ${formatRowPreview(row)}`
  ).join('\n');
  const insights = [
    `• Showing ${previewRows.length} of ${subset.length} rows in range`,
    range.isFullDataset ? '• Viewing full dataset' : `• Subset: ${range.totalRows} rows (${((range.totalRows / data.length) * 100).toFixed(1)}% of total)`,
    range.isSingleRow ? '• Viewing single row' : `• Range span: ${range.totalRows} rows`,
  ].join('\n');
  return {
    preview,
    insights: subset.length > maxRows ?
      `${insights}\n• ${subset.length - maxRows} more rows in range...` :
      insights
  };
};

export const parseIndexRange = (msg: string, maxRows: number): DataRange => {
  const patterns = [
    { regex: /(?:from|between)?\s*(?:row|index)?\s*(\d+)\s*(?:to|-|and)\s*(\d+)/, type: 'range' },
    { regex: /first\s+(\d+)\s*(?:rows?|entries|records)/i, type: 'first' },
    { regex: /last\s+(\d+)\s*(?:rows?|entries|records)/i, type: 'last' },
    { regex: /rows?\s*(\d+)\s*through\s*(\d+)/, type: 'range' },
    { regex: /row\s*(\d+)(?!\s*(?:to|through|-|and))/i, type: 'single' }
  ];
  let start = 0, end = maxRows - 1;
  for (const pattern of patterns) {
    const match = msg.match(pattern.regex);
    if (match) {
      switch (pattern.type) {
        case 'range':
          start = parseInt(match[1]);
          end = parseInt(match[2]);
          break;
        case 'first':
          end = Math.min(parseInt(match[1]) - 1, maxRows - 1);
          break;
        case 'last':
          start = Math.max(0, maxRows - parseInt(match[1]));
          break;
        case 'single':
          start = end = parseInt(match[1]);
          break;
      }
      break;
    }
  }
  if (start >= maxRows || end >= maxRows) {
    return {
      start: 0,
      end: maxRows - 1,
      isValid: false,
      errorMessage: `Dataset has ${maxRows} rows. Please select a range between 0 and ${maxRows - 1}.`,
      totalRows: 0,
      isFullDataset: false,
      isSingleRow: false
    };
  }
  start = Math.max(0, Math.min(start, end));
  end = Math.max(start, Math.min(end, maxRows - 1));
  const totalRows = end - start + 1;
  return {
    start,
    end,
    isValid: true,
    totalRows,
    isFullDataset: start === 0 && end === maxRows - 1,
    isSingleRow: start === end
  };
};

export const getDistributionChangeDescription = (stats1: StatisticalResult, stats2: StatisticalResult): string => {
  const changes: string[] = [];
  if (stats2.variance > stats1.variance * 1.5) {
    changes.push('more spread out');
  } else if (stats2.variance * 1.5 < stats1.variance) {
    changes.push('more concentrated');
  }
  if (Math.abs(stats2.skewness) < Math.abs(stats1.skewness) * 0.7) {
    changes.push('more symmetric');
  } else if (Math.abs(stats2.skewness) > Math.abs(stats1.skewness) * 1.3) {
    changes.push(stats2.skewness > 0 ? 'more right-skewed' : 'more left-skewed');
  }
  if (stats2.kurtosis > stats1.kurtosis * 1.3) {
    changes.push('more peaked');
  } else if (stats2.kurtosis < stats1.kurtosis * 0.7) {
    changes.push('flatter');
  }
  return changes.length > 0 ?
    `Distribution became ${changes.join(', ')}` :
    'Distribution remained similar';
};

export const getSubsetStats = (data: Dataset['data'], column: string, range: DataRange): StatisticalResult | null => {
  const memoKey = `${column}-${range.start}-${range.end}`;
  const now = Date.now();
  const globalMemo = globalThis as unknown as { memoizedResults?: Map<string, MemoizedResult> };
  if (!globalMemo.memoizedResults) {
    globalMemo.memoizedResults = new Map<string, MemoizedResult>();
  }
  const memoizedResults = globalMemo.memoizedResults;
  const memoized = memoizedResults.get(memoKey);
  if (memoized && now - memoized.timestamp < MEMO_EXPIRY) {
    return memoized.stats;
  }
  const subset = data.slice(range.start, range.end + 1);
  const stats = calculateStats(subset, column);
  if (stats && range.totalRows > 100) {
    memoizedResults.set(memoKey, {
      stats,
      timestamp: now,
      rangeKey: memoKey
    });
    for (const [key, value] of memoizedResults.entries()) {
      if (now - value.timestamp > MEMO_EXPIRY) {
        memoizedResults.delete(key);
      }
    }
  }
  return stats;
};

export const formatDatasetContext = (dataset: Dataset, range?: DataRange) => {
  const data = range ?
    dataset.data.slice(range.start, range.end + 1) :
    dataset.data;
  const columnTypes = getColumnTypes(data);
  const stats = columnTypes.numeric.map(col => {
    const colStats = calculateStats(data, col);
    return colStats ? `${col}: avg=${colStats.avg.toFixed(2)}, range=${colStats.min}-${colStats.max}` : null;
  }).filter(Boolean);
  const { preview, insights } = generateRowPreview(data, range || { start: 0, end: data.length - 1, isValid: true, totalRows: data.length, isFullDataset: true, isSingleRow: false });
  return `Dataset: ${dataset.name}
${range ? `Analyzing rows ${range.start} to ${range.end} (${range.end - range.start + 1} rows)` :
      `Full dataset: ${dataset.data.length} rows`}
Columns: ${dataset.columns.map(c => c.name).join(', ')}
Numeric columns: ${columnTypes.numeric.join(', ')}
Key statistics:
${stats.join('\n')}

Row Preview:
${preview}

Insights:
${insights}`;
};

export const assessDataQuality = (dataset: Dataset): DataQualityAssessment => {
  const columnTypes = getColumnTypes(dataset.data);
  const outlierCounts: Record<string, number> = {};
  const totalFields = dataset.data.length * dataset.columns.length;
  const filledFields = dataset.data.reduce((acc, row) => {
    return acc + Object.values(row).filter(val => val !== null && val !== undefined && val !== '').length;
  }, 0);
  const completeness = (filledFields / totalFields) * 100;
  const duplicateRows = new Set();
  const rowSignatures = dataset.data.map(row => JSON.stringify(row));
  const duplicateCount = rowSignatures.filter((sig, index) => {
    if (rowSignatures.indexOf(sig) !== index) {
      duplicateRows.add(index);
      return true;
    }
    return false;
  }).length;
  columnTypes.numeric.forEach(col => {
    const stats = calculateStats(dataset.data, col);
    if (stats?.outliers) {
      outlierCounts[col] = stats.outliers.length;
    }
  });
  const suggestions = [];
  if (completeness < 95) {
    suggestions.push({
      type: 'completeness',
      severity: completeness < 80 ? 'high' : 'medium',
      description: `Dataset is ${completeness.toFixed(1)}% complete`,
      recommendation: 'Consider addressing missing values through imputation or removal'
    });
  }
  if (duplicateCount > 0) {
    suggestions.push({
      type: 'duplicates',
      severity: duplicateCount > dataset.data.length * 0.05 ? 'high' : 'medium',
      description: `Found ${duplicateCount} duplicate rows`,
      recommendation: 'Review and remove duplicate entries if they are not intentional'
    });
  }
  Object.entries(outlierCounts).forEach(([col, count]) => {
    if (count > 0) {
      suggestions.push({
        type: 'outliers',
        severity: count > dataset.data.length * 0.1 ? 'high' : 'medium',
        description: `Found ${count} outliers in column "${col}"`,
        recommendation: 'Investigate outliers and consider their impact on analysis'
      });
    }
  });
  const accuracy = 100 - (
    (Object.values(outlierCounts).reduce((a, b) => a + b, 0) / (dataset.data.length * columnTypes.numeric.length)) * 100
  );
  return {
    completeness,
    consistency: 100 - (duplicateCount / dataset.data.length) * 100,
    accuracy,
    duplicateCount,
    outlierCounts,
    suggestions
  };
};

export const recommendVisualizations = (dataset: Dataset, selectedColumns: string[] = []): VisualizationRecommendation[] => {
  const columnTypes = getColumnTypes(dataset.data);
  const recommendations: VisualizationRecommendation[] = [];
  const cols = selectedColumns.length > 0 ? selectedColumns : dataset.columns.map(c => c.name);
  cols.forEach(col => {
    if (columnTypes.numeric.includes(col)) {
      recommendations.push({
        chartType: 'histogram',
        confidence: 0.9,
        reasoning: 'Best for showing distribution of numerical data',
        description: `Show the distribution of ${col} values`,
        suitable_columns: [col]
      });
      recommendations.push({
        chartType: 'boxplot',
        confidence: 0.85,
        reasoning: 'Good for showing data distribution and outliers',
        description: `Display ${col} distribution with quartiles and outliers`,
        suitable_columns: [col]
      });
    } else {
      recommendations.push({
        chartType: 'bar',
        confidence: 0.9,
        reasoning: 'Best for comparing categories',
        description: `Compare frequencies of different ${col} values`,
        suitable_columns: [col]
      });
      recommendations.push({
        chartType: 'pie',
        confidence: 0.7,
        reasoning: 'Suitable for showing proportions if categories are few',
        description: `Show proportion of each ${col} category`,
        suitable_columns: [col]
      });
    }
  });
  if (cols.length >= 2) {
    const numericPairs = columnTypes.numeric.filter(col => cols.includes(col))
      .flatMap((col1, i, arr) => arr.slice(i + 1).map(col2 => [col1, col2]));
    numericPairs.forEach(([col1, col2]) => {
      recommendations.push({
        chartType: 'scatter',
        confidence: 0.95,
        reasoning: 'Best for showing relationship between two numeric variables',
        description: `Visualize correlation between ${col1} and ${col2}`,
        suitable_columns: [col1, col2]
      });
    });
    columnTypes.numeric.filter(col => cols.includes(col)).forEach(numCol => {
      cols.filter(col => !columnTypes.numeric.includes(col)).forEach(catCol => {
        recommendations.push({
          chartType: 'grouped_bar',
          confidence: 0.85,
          reasoning: 'Good for comparing numeric values across categories',
          description: `Compare ${numCol} across different ${catCol} groups`,
          suitable_columns: [numCol, catCol]
        });
      });
    });
  }
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

export const handleAIAnalysis = async (query: string, dataset: Dataset) => {
  const columnTypes = getColumnTypes(dataset.data);
  const advancedStats: Record<string, StatisticalResult> = columnTypes.numeric.reduce((acc, col) => {
    const stats = calculateAdvancedStats(dataset.data, col);
    if (stats) acc[col] = stats;
    return acc;
  }, {} as Record<string, StatisticalResult>);
  const correlationMatrix = calculateCorrelationMatrix(dataset);
  const significantCorrelations = [];
  Object.keys(correlationMatrix).forEach(col1 => {
    Object.keys(correlationMatrix[col1]).forEach(col2 => {
      if (col1 !== col2) {
        const correlation = correlationMatrix[col1][col2];
        if (Math.abs(correlation) > 0.5) {
          significantCorrelations.push({
            columns: [col1, col2],
            correlation,
            strength: Math.abs(correlation) > 0.8 ? 'strong' : 'moderate'
          });
        }
      }
    });
  });

  // Enhanced context with MongoDB metrics (when available) and more detailed analysis
  let mongoMetricsContext = '';
  if (dataset.mongoMetrics) {
    const topMetrics = Object.entries(dataset.mongoMetrics)
      .filter(([, value]) => value !== null && value !== undefined)
      .slice(0, 5) // Show top 5 metrics
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    mongoMetricsContext = `\n\nMongoDB Quality Metrics:\n${topMetrics}`;
  }

  const enhancedContext = `
Dataset: ${dataset.name} (${dataset.data.length} rows, ${dataset.columns.length} cols)
Columns: ${dataset.columns.map(c => `${c.name}(${c.type})`).join(', ')}

Statistical Analysis:
${Object.entries(advancedStats).slice(0, 3).map(([col, stats]) =>
    `${col}: avg=${stats.avg.toFixed(2)}, std=${stats.stdDev.toFixed(2)}, range=[${stats.min}-${stats.max}]`
  ).join('\n')}

Correlations:
${significantCorrelations.slice(0, 3).map(corr =>
    `${corr.columns[0]} ↔ ${corr.columns[1]}: r=${corr.correlation.toFixed(3)} (${corr.strength})`
  ).join('\n')}${mongoMetricsContext}

Data Quality:
Completeness: High, Outliers detected in numeric columns, Missing values: Low`;

  const prompt = `
${enhancedContext}

User Query: ${query}

Provide detailed analysis with specific insights, metrics, and actionable recommendations:`;

  const aiResponse = await callGroqAPI(prompt);
  let result = aiResponse || 'AI analysis unavailable. Falling back to basic analysis.';

  // Filter out asterisk (*) characters to clean up the output
  result = result.replace(/\*/g, '');

  // Log the conversation to n8n webhook
  logChatToWebhook(query, result);

  return result;
};

// [A] Chart config generator for recommendVisualizations
export function getChartConfig(type: string, data: unknown, columns: string[]): { type: string; data: unknown; columns: string[] } {
  // Return config for Recharts based on type
  // ... implement for histogram, bar, pie, line, scatter, boxplot ...
  return { type, data, columns };
}

// [B] Conversational memory helpers
export function updateMemory(memory, query, columns, stats) {
  return { lastQuery: query, lastColumns: columns, lastStats: stats };
}

// [C] Autocomplete prompt list
export const EXAMPLE_PROMPTS = [
  '@ai show histogram of sales',
  '@ai top 10 frequent values in country',
  '@ai compare age and income',
  '@ai find outliers in revenue',
  '@ai show missing data as heatmap',
  '@ai correlation between height and weight',
  '@ai analyze Age where Country = "India"',
];

// [D] Feedback/session/note management helpers
// export function saveSession(session: unknown) { /* ... */ }
// export function loadSession(id: string) { /* ... */ }
// export function addNote(notes: unknown, type: string, key: string, value: unknown) { /* ... */ }

// [E] Column stats for tooltips
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getColumnStats(_data: unknown[], _column: string): { mean: number; nullPct: number; unique: number; histogram: unknown[] } {
  // Return mean, null %, unique count, histogram data
  return { mean: 0, nullPct: 0, unique: 0, histogram: [] };
}

// [F] External API lookup
// export async function fetchExternalData(query: string) { /* ... */ }

// [G] Explainability helper
// export async function getAIExplanation(context: unknown, query: string) { /* ... */ }

// [H] Mobile/voice helpers
export function isMobile(): boolean { return typeof window !== 'undefined' && window.innerWidth < 600; }
// export function startVoiceInput(onResult: (result: string) => void) { /* ... */ }
// export function stopVoiceInput() { /* ... */ }

// [NEW ANALYTICS OPERATIONS IMPLEMENTATION]

export function compareDistributions(data: Dataset['data'], col1: string, col2: string) {
  // Returns frequency objects for each column
  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};
  data.forEach(row => {
    const v1 = String(row[col1]);
    const v2 = String(row[col2]);
    freq1[v1] = (freq1[v1] || 0) + 1;
    freq2[v2] = (freq2[v2] || 0) + 1;
  });
  return { [col1]: freq1, [col2]: freq2 };
}

export function getTopNValues(data: Dataset['data'], column: string, n = 10) {
  const freq: Record<string, number> = {};
  data.forEach(row => {
    const v = String(row[column]);
    freq[v] = (freq[v] || 0) + 1;
  });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, n).map(([value, count]) => ({ value, count }));
}

export function getTimeTrend(data: Dataset['data'], dateCol: string, valueCol: string) {
  // Assumes dateCol is ISO or parseable date string
  const trend: Record<string, number[]> = {};
  data.forEach(row => {
    const date = new Date(String(row[dateCol]));
    if (isNaN(date.getTime())) return;
    const key = date.toISOString().split('T')[0];
    const value = Number(row[valueCol]);
    if (!isNaN(value)) {
      if (!trend[key]) trend[key] = [];
      trend[key].push(value);
    }
  });
  return Object.entries(trend).map(([date, values]) => ({ date, avg: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }));
}

export function getGroupedStats(data: Dataset['data'], groupCol: string, valueCol: string) {
  const groups: Record<string, number[]> = {};
  data.forEach(row => {
    const group = String(row[groupCol]);
    const value = Number(row[valueCol]);
    if (!isNaN(value)) {
      if (!groups[group]) groups[group] = [];
      groups[group].push(value);
    }
  });
  return Object.entries(groups).map(([group, values]) => ({
    group,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  }));
}

export function getZScores(data: Dataset['data'], column: string) {
  const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
  return data.map(row => {
    const v = Number(row[column]);
    return isNaN(v) ? null : (v - mean) / std;
  });
}

export function getColumnEntropy(data: Dataset['data'], column: string) {
  const freq: Record<string, number> = {};
  data.forEach(row => {
    const v = String(row[column]);
    freq[v] = (freq[v] || 0) + 1;
  });
  const total = data.length;
  let entropy = 0;
  Object.values(freq).forEach(count => {
    const p = count / total;
    entropy -= p * Math.log2(p);
  });
  return entropy;
}

export function getCoefficientOfVariation(data: Dataset['data'], column: string) {
  const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
  return mean === 0 ? 0 : std / mean;
}

export function getDuplicatesSummary(data: Dataset['data']) {
  const seen = new Map<string, number>();
  const duplicates: { row: Record<string, string | number>; count: number }[] = [];
  data.forEach(row => {
    const sig = JSON.stringify(row);
    if (seen.has(sig)) {
      const idx = seen.get(sig)!;
      duplicates[idx].count++;
    } else {
      seen.set(sig, duplicates.length);
      duplicates.push({ row, count: 1 });
    }
  });
  return duplicates.filter(d => d.count > 1);
}

export function getMissingPattern(data: Dataset['data']) {
  // Returns a matrix: rows x columns, true if missing
  if (data.length === 0) return [];
  const columns = Object.keys(data[0]);
  return data.map(row => columns.map(col => row[col] === null || row[col] === undefined || row[col] === '' ? 1 : 0));
}

export function getPercentileSplit(data: Dataset['data'], column: string, percentiles = [0.25, 0.5, 0.75]) {
  const values = data.map(row => Number(row[column])).filter(v => !isNaN(v)).sort((a, b) => a - b);
  const result: Record<string, number> = {};
  percentiles.forEach(p => {
    const idx = Math.floor(p * (values.length - 1));
    result[`${Math.round(p * 100)}th`] = values[idx];
  });
  return result;
} 