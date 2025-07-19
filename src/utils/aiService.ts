import OpenAI from 'openai';

export interface AnalyticsOperation {
  id: string;
  label: string;
  description: string;
  category: 'basic' | 'statistical' | 'distribution' | 'advanced';
}

export const ANALYTICS_OPERATIONS: AnalyticsOperation[] = [
  {
    id: 'average',
    label: 'Average',
    description: 'Calculate the mean value of a numeric column',
    category: 'basic'
  },
  {
    id: 'correlation',
    label: 'Correlation',
    description: 'Analyze relationships between numeric columns',
    category: 'statistical'
  },
  {
    id: 'min',
    label: 'Minimum',
    description: 'Find the smallest value in a column',
    category: 'basic'
  },
  {
    id: 'max',
    label: 'Maximum',
    description: 'Find the largest value in a column',
    category: 'basic'
  },
  {
    id: 'null_count',
    label: 'Null Count',
    description: 'Count missing values in a column',
    category: 'basic'
  },
  {
    id: 'unique_values',
    label: 'Unique Values',
    description: 'List distinct values in a column',
    category: 'basic'
  },
  {
    id: 'data_types',
    label: 'Data Types',
    description: 'Show data type information for columns',
    category: 'basic'
  },
  {
    id: 'histogram',
    label: 'Histogram',
    description: 'View distribution of values in a column',
    category: 'distribution'
  },
  {
    id: 'outliers',
    label: 'Outliers',
    description: 'Identify unusual values in a column',
    category: 'advanced'
  },
  {
    id: 'summary_stats',
    label: 'Summary Stats',
    description: 'Get comprehensive statistical overview',
    category: 'statistical'
  },
  {
    id: 'distribution_compare',
    label: 'Compare Distribution',
    description: 'Compare the value distribution between two columns or groups',
    category: 'distribution',
  },
  {
    id: 'top_n_values',
    label: 'Top Values',
    description: 'Show most frequent values in a text or categorical column',
    category: 'basic',
  },
  {
    id: 'time_trend',
    label: 'Time Trend',
    description: 'Plot trends over time for numeric columns (if a date column exists)',
    category: 'advanced',
  },
  {
    id: 'grouped_stats',
    label: 'Group Stats',
    description: 'Aggregate numeric columns by category columns (e.g. average salary by department)',
    category: 'advanced',
  },
  {
    id: 'zscore',
    label: 'Z-Score',
    description: 'Calculate how far each value is from the mean in terms of standard deviations (detect outliers)',
    category: 'advanced',
  },
  {
    id: 'column_entropy',
    label: 'Entropy Score',
    description: 'Measures information density of a column',
    category: 'advanced',
  },
  {
    id: 'coefficient_variation',
    label: 'Coefficient of Var',
    description: 'Useful for comparing variability',
    category: 'advanced',
  },
  {
    id: 'duplicates_summary',
    label: 'Duplicate Rows',
    description: 'Show examples of duplicate rows',
    category: 'basic',
  },
  {
    id: 'missing_pattern',
    label: 'Missing Pattern',
    description: 'Show missing value matrix heatmap',
    category: 'distribution',
  },
  {
    id: 'percentile_split',
    label: 'Percentiles',
    description: 'Split numeric column into quartiles/deciles',
    category: 'statistical',
  },
];

interface AIResponse {
  operation: string | null;
  column: string | null;
  confidence: number;
}

interface AIInteractiveResponse extends AIResponse {
  availableOperations?: AnalyticsOperation[];
  availableColumns?: string[];
  message?: string;
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL,
    'X-Title': 'DataVizAI',
  },
});

export async function extractIntent(
  userInput: string,
  availableColumns: string[],
  supportedOperations?: string[]
): Promise<AIResponse> {
  try {
    const systemPrompt = `You are a specialized data analysis intent extractor. Your sole purpose is to convert natural language queries into structured JSON format.

Available columns in the dataset: ${availableColumns.join(', ')}
${supportedOperations ? `Available operations: ${supportedOperations.join(', ')}` : ''}

RULES:
1. Return ONLY a JSON object with these fields:
   - operation: the data operation requested (or null if unclear)
   - column: the column name from the available list (or null if unclear)
   - confidence: number 0-1 showing certainty

2. Match column names EXACTLY from the available list
3. Keep responses concise and strictly JSON format

Examples:
User: "what's the average age?"
{"operation": "average", "column": "age", "confidence": 0.95}

User: "show me hypertension distribution"
{"operation": "distribution", "column": "hypertension", "confidence": 0.9}

User: "how many smokers?"
{"operation": "count", "column": "smoking", "confidence": 0.85}`;

    const completion = await openai.chat.completions.create({

      model: 'deepseek/deepseek-r1-0528:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      temperature: 0.1, // Low temperature for more consistent outputs
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI model');
    }

    // Parse the JSON response
    const result = JSON.parse(response) as AIResponse;

    // Validate the column exists
    if (result.column && !availableColumns.includes(result.column)) {
      result.column = null;
      result.confidence *= 0.5;
    }

    return result;
  } catch (error) {
    console.error('AI intent extraction failed:', error);
    return {
      operation: null,
      column: null,
      confidence: 0
    };
  }
}

export function getAvailableOperations(): AnalyticsOperation[] {
  return ANALYTICS_OPERATIONS;
}

export function getCategoryOperations(category: string): AnalyticsOperation[] {
  return ANALYTICS_OPERATIONS.filter(op => op.category === category);
}

export async function handleInteractiveQuery(
  operation: string | null,
  column: string | null,
  availableColumns: string[]
): Promise<AIInteractiveResponse> {
  if (!operation && !column) {
    return {
      operation: null,
      column: null,
      confidence: 1,
      availableOperations: getAvailableOperations(),
      message: "Please select an operation to analyze your data."
    };
  }

  if (operation && !column) {
    return {
      operation,
      column: null,
      confidence: 1,
      availableColumns,
      message: `Please select a column to ${operation} on.`
    };
  }

  // When both operation and column are selected
  if (operation && column) {
    return {
      operation,
      column,
      confidence: 1,
      message: `Analyzing ${column} using ${operation}...`
    };
  }

  return {
    operation: null,
    column: null,
    confidence: 0,
    message: "I couldn't understand your request. Please try again."
  };
}

export async function lookupExternalAPI(_query: string) {
  // Example: fetch from World Bank, government APIs, etc.
  return { source: 'external', value: null };
}

export async function getAIExplanation(_context: unknown, _query: string) {
  // Call LLM with self-explanation prompt
  return 'This result was computed using ...';
}
