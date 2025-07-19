import { extractIntent } from './aiService';
import { Parameters } from '../types/chatTypes';

export interface ConversationContext {
  lastColumn?: string;
  lastOperation?: string;
  lastDataset?: string;
  lastFilter?: string;
  lastGroupBy?: string;
  lastVisualization?: string;
  conversationHistory?: Array<{
    input: string;
    operation: string;
    column: string;
    timestamp: Date;
  }>;
  userPreferences?: {
    defaultVisualization?: string;
    preferredStatistics?: string[];
    outputFormat?: 'detailed' | 'summary' | 'visual';
  };
}

// Type definitions
type OperationName = 'average' | 'median' | 'mode' | 'minimum' | 'maximum' | 'range' |
  'standardDeviation' | 'variance' | 'skewness' | 'kurtosis' | 'percentile' |
  'count' | 'unique' | 'nullCount' | 'nonNullCount' | 'distribution' | 'histogram' |
  'correlation' | 'covariance' | 'filter' | 'top' | 'bottom' | 'groupBy' | 'pivot' |
  'sort' | 'compare' | 'outliers' | 'plot' | 'scatterPlot' | 'linePlot' | 'barChart' |
  'boxPlot' | 'trend' | 'forecast' | 'wordCount' | 'sum' | 'product' | 'percentage';

type OperationSynonyms = {
  [K in OperationName]: string[];
};

export interface ParseResult {
  operation: string | null;
  column: string | null;
  confidence: number;
  alternatives: {
    operations: string[];
    columns: string[];
  };
  context: ConversationContext;
  suggestions: string[];
  intentType: 'question' | 'command' | 'clarification' | 'comparison';
  parameters: Parameters;
  debug?: {
    ruleBased: {
      operationConfidence: number;
      columnConfidence: number;
      detectedOperation: string | null;
      detectedColumn: string | null;
    };
    ai?: {
      confidence: number;
      detectedOperation: string | null;
      detectedColumn: string | null;
    };
    finalSource: 'rule-based' | 'ai';
  };
}

// Export the correctly typed operation synonyms
export const operationSynonyms: OperationSynonyms = {
  average: [
    'avg', 'mean', 'average of', 'avg of', 'mean of', 'arithmetic mean',
    'what is the average', 'what is the mean', 'what\'s the average', 'what\'s the mean',
    'calculate average', 'compute mean', 'find average', 'get mean',
    'average value', 'mean value', 'typical value', 'central tendency',
    'what is the avg', 'what\'s the avg', 'the avg of', 'avg of'
  ],
  median: [
    'middle value', 'median of', 'what is the median', 'what\'s the median',
    'middle point', 'find median', 'calculate median', 'get median',
    '50th percentile', 'second quartile', 'Q2'
  ],
  mode: [
    'most common', 'most frequent', 'mode of', 'what is the mode',
    'what\'s the mode', 'most occurring', 'highest frequency',
    'find mode', 'calculate mode', 'modal value'
  ],
  minimum: [
    'min', 'minimum of', 'smallest', 'lowest', 'least',
    'what is the minimum', 'what\'s the minimum', 'what is the min',
    'find minimum', 'get min', 'lowest value', 'smallest value',
    'bottom value', 'minimum value'
  ],
  maximum: [
    'max', 'maximum of', 'largest', 'highest', 'greatest',
    'what is the maximum', 'what\'s the maximum', 'what is the max',
    'find maximum', 'get max', 'highest value', 'largest value',
    'top value', 'maximum value', 'peak value'
  ],
  range: [
    'range of', 'spread', 'difference between max and min',
    'what is the range', 'calculate range', 'find range',
    'min to max', 'value range', 'data range'
  ],
  
  // Advanced Statistics
  standardDeviation: [
    'std dev', 'standard deviation', 'std deviation', 'deviation',
    'calculate std dev', 'find standard deviation', 'variability',
    'sigma', 'population std dev', 'sample std dev'
  ],
  variance: [
    'variance of', 'var', 'calculate variance', 'find variance',
    'what is the variance', 'data variance', 'population variance',
    'sample variance'
  ],
  skewness: [
    'skew', 'skewness of', 'asymmetry', 'data skew',
    'calculate skewness', 'find skewness', 'distribution skew'
  ],
  kurtosis: [
    'kurtosis of', 'tailedness', 'calculate kurtosis',
    'find kurtosis', 'distribution shape'
  ],
  
  // Percentiles and Quartiles
  percentile: [
    'percentile', 'quantile', 'nth percentile', 'quartile',
    'Q1', 'Q3', 'first quartile', 'third quartile',
    'calculate percentile', 'find percentile', 'quantile value'
  ],
  
  // Counting Operations
  count: [
    'how many', 'total count', 'number of', 'count of', 'tally',
    'count rows', 'row count', 'total rows', 'size',
    'length', 'total number', 'count records'
  ],
  unique: [
    'distinct', 'different', 'unique values', 'distinct values',
    'how many unique', 'how many distinct', 'unique count',
    'distinct count', 'cardinality', 'number of unique'
  ],
  nullCount: [
    'null count', 'missing values', 'empty values', 'na count',
    'how many nulls', 'how many missing', 'blank values',
    'undefined values', 'count nulls', 'missing data'
  ],
  nonNullCount: [
    'non null count', 'valid values', 'non missing', 'filled values',
    'how many non null', 'valid count', 'complete values'
  ],
  
  // Distribution Analysis
  distribution: [
    'spread', 'distribute', 'histogram', 'distribution of',
    'how is it distributed', 'frequency distribution',
    'data distribution', 'value distribution', 'show distribution',
    'plot distribution', 'frequency plot'
  ],
  histogram: [
    'histogram', 'hist', 'frequency chart', 'bar chart',
    'distribution chart', 'frequency histogram', 'show histogram'
  ],
  
  // Correlation and Relationships
  correlation: [
    'correlate', 'relationship', 'related to', 'correlation between',
    'how does it relate', 'corr', 'correlation coefficient',
    'pearson correlation', 'spearman correlation', 'kendall correlation',
    'association', 'dependency', 'linear relationship'
  ],
  covariance: [
    'covariance', 'cov', 'covariance between', 'calculate covariance',
    'find covariance', 'joint variability'
  ],
  
  // Filtering and Selection
  filter: [
    'filter', 'where', 'select where', 'filter by', 'subset',
    'condition', 'criteria', 'only show', 'exclude',
    'include only', 'filter out', 'remove'
  ],
  top: [
    'top', 'highest', 'largest', 'biggest', 'top n',
    'first n', 'head', 'best', 'maximum n'
  ],
  bottom: [
    'bottom', 'lowest', 'smallest', 'worst', 'bottom n',
    'last n', 'tail', 'minimum n'
  ],
  
  // Grouping and Aggregation
  groupBy: [
    'group by', 'group', 'aggregate by', 'categorize by',
    'split by', 'partition by', 'break down by',
    'summarize by', 'group on'
  ],
  pivot: [
    'pivot', 'pivot table', 'cross tabulation', 'crosstab',
    'pivot by', 'transpose', 'reshape'
  ],
  
  // Sorting
  sort: [
    'sort', 'order', 'arrange', 'sort by', 'order by',
    'ascending', 'descending', 'rank', 'sort ascending',
    'sort descending', 'arrange by'
  ],
  
  // Comparison Operations
  compare: [
    'compare', 'comparison', 'versus', 'vs', 'against',
    'difference between', 'compare to', 'contrast',
    'side by side', 'compare with'
  ],
  
  // Outlier Detection
  outliers: [
    'outliers', 'anomalies', 'unusual values', 'extreme values',
    'outlier detection', 'find outliers', 'identify outliers',
    'abnormal values', 'deviations'
  ],
  
  // Visualization
  plot: [
    'plot', 'chart', 'graph', 'visualize', 'show plot',
    'create chart', 'make graph', 'display chart'
  ],
  scatterPlot: [
    'scatter plot', 'scatter chart', 'scatter', 'point plot',
    'xy plot', 'correlation plot'
  ],
  linePlot: [
    'line plot', 'line chart', 'line graph', 'time series',
    'trend line', 'line visualization'
  ],
  barChart: [
    'bar chart', 'bar plot', 'column chart', 'bar graph',
    'categorical chart', 'frequency bar'
  ],
  boxPlot: [
    'box plot', 'box and whisker', 'boxplot', 'quartile plot',
    'five number summary', 'box chart'
  ],
  
  // Time Series Operations
  trend: [
    'trend', 'trending', 'pattern', 'time series', 'over time',
    'temporal pattern', 'seasonal pattern', 'trend analysis'
  ],
  forecast: [
    'forecast', 'predict', 'projection', 'future values',
    'extrapolate', 'predict future', 'time series forecast'
  ],
  
  // Text Analysis (for string columns)
  wordCount: [
    'word count', 'text length', 'character count', 'string length',
    'text analysis', 'word frequency'
  ],
  
  // Mathematical Operations
  sum: [
    'sum', 'total', 'add up', 'sum of', 'total of',
    'calculate sum', 'find total', 'aggregate sum'
  ],
  product: [
    'product', 'multiply', 'multiplication', 'product of',
    'calculate product', 'multiply all'
  ],
  
  // Percentage Operations
  percentage: [
    'percentage', 'percent', 'proportion', 'ratio',
    'percentage of', 'what percent', 'proportion of'
  ]
};

// Enhanced column name matching with fuzzy logic and advanced algorithms
export const findBestColumnMatch = (
  input: string, 
  availableColumns: string[]
): { column: string | null; confidence: number; alternatives: string[] } => {
  const normalizedInput = input.toLowerCase().replace(/[^a-z0-9_]/g, '');
  
  // Exact match (highest confidence)
  const exactMatch = availableColumns.find(col => 
    col.toLowerCase() === normalizedInput ||
    col.toLowerCase().replace(/[^a-z0-9_]/g, '') === normalizedInput
  );
  if (exactMatch) {
    return { column: exactMatch, confidence: 1.0, alternatives: [] };
  }

  // Calculate similarity scores for all columns
  const columnScores = availableColumns.map(col => {
    const normalizedCol = col.toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    // Levenshtein distance
    const levenshteinScore = 1 - (levenshteinDistance(normalizedInput, normalizedCol) / 
      Math.max(normalizedInput.length, normalizedCol.length));
    
    // Substring matching
    const substringScore = normalizedInput.includes(normalizedCol) || 
      normalizedCol.includes(normalizedInput) ? 0.8 : 0;
    
    // Token-based matching
    const inputTokens = normalizedInput.split(/[^a-z0-9]+/).filter(t => t.length > 0);
    const colTokens = normalizedCol.split(/[^a-z0-9]+/).filter(t => t.length > 0);
    
    const matchingTokens = inputTokens.filter(token => 
      colTokens.some(colToken => colToken.includes(token) || token.includes(colToken))
    );
    const tokenScore = matchingTokens.length / Math.max(inputTokens.length, colTokens.length);
    
    // Jaccard similarity
    const inputSet = new Set(inputTokens);
    const colSet = new Set(colTokens);
    const intersection = new Set([...inputSet].filter(x => colSet.has(x)));
    const union = new Set([...inputSet, ...colSet]);
    const jaccardScore = intersection.size / union.size;
    
    // Combined score
    const combinedScore = Math.max(levenshteinScore, substringScore, tokenScore, jaccardScore);
    
    return {
      column: col,
      score: combinedScore,
      levenshtein: levenshteinScore,
      substring: substringScore,
      token: tokenScore,
      jaccard: jaccardScore
    };
  });

  // Sort by score and get top candidates
  const sortedColumns = columnScores.sort((a, b) => b.score - a.score);
  const bestMatch = sortedColumns[0];
  
  // Return result with confidence and alternatives
  if (bestMatch.score > 0.3) {
    const alternatives = sortedColumns
      .slice(1, 4)
      .filter(col => col.score > 0.2)
      .map(col => col.column);
    
    return {
      column: bestMatch.column,
      confidence: bestMatch.score,
      alternatives
    };
  }
  
  return { column: null, confidence: 0, alternatives: [] };
};

// Levenshtein distance calculation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator  // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Enhanced operation detection with context awareness
export const detectOperation = (
  input: string, 
  context?: ConversationContext
): { operation: string | null; confidence: number; alternatives: string[] } => {
  const normalizedInput = input.toLowerCase();
  
  // Check for compound operations (e.g., "average and standard deviation")
  const compoundOperations = detectCompoundOperations(normalizedInput);
  if (compoundOperations.length > 1) {
    return {
      operation: compoundOperations[0],
      confidence: 0.9,
      alternatives: compoundOperations.slice(1)
    };
  }
  
  // Score all operations
  const operationScores: Array<{ operation: string; score: number }> = [];
  
  for (const [operation, synonyms] of Object.entries(operationSynonyms)) {
    let bestScore = 0;
    
    for (const synonym of synonyms) {
      const synonymScore = calculateSynonymScore(normalizedInput, synonym.toLowerCase());
      bestScore = Math.max(bestScore, synonymScore);
    }
    
    // Boost score if it matches recent context
    if (context?.lastOperation === operation) {
      bestScore *= 1.2;
    }
    
    if (bestScore > 0) {
      operationScores.push({ operation, score: bestScore });
    }
  }
  
  // Sort and return best match
  operationScores.sort((a, b) => b.score - a.score);
  
  if (operationScores.length > 0 && operationScores[0].score > 0.3) {
    return {
      operation: operationScores[0].operation,
      confidence: operationScores[0].score,
      alternatives: operationScores.slice(1, 3).map(op => op.operation)
    };
  }
  
  return { operation: null, confidence: 0, alternatives: [] };
};

// Calculate synonym matching score
const calculateSynonymScore = (input: string, synonym: string): number => {
  if (input.includes(synonym)) return 1.0;
  if (synonym.includes(input)) return 0.8;
  
  // Word boundary matching
  const words = input.split(/\s+/);
  const synonymWords = synonym.split(/\s+/);
  
  const matchingWords = words.filter(word => 
    synonymWords.some(synWord => synWord.includes(word) || word.includes(synWord))
  );
  
  return matchingWords.length / Math.max(words.length, synonymWords.length);
};

// Detect compound operations
const detectCompoundOperations = (input: string): string[] => {
  const operations: string[] = [];
  
  for (const [operation, synonyms] of Object.entries(operationSynonyms)) {
    if (synonyms.some(synonym => input.includes(synonym.toLowerCase()))) {
      operations.push(operation);
    }
  }
  
  return operations;
};

// Enhanced input parsing with multiple possibilities
export const parseUserInput = async (
  input: string,
  availableColumns: string[],
  context: ConversationContext = {}
): Promise<ParseResult> => {
  console.log('Processing input:', input);
  
  const operationResult = detectOperation(input, context);
  const columnResult = findBestColumnMatch(input, availableColumns);
  
  console.log('Rule-based detection:', {
    operation: { result: operationResult.operation, confidence: operationResult.confidence },
    column: { result: columnResult.column, confidence: columnResult.confidence }
  });
  
  // Create debug info
  const debug: ParseResult['debug'] = {
    ruleBased: {
      operationConfidence: operationResult.confidence,
      columnConfidence: columnResult.confidence,
      detectedOperation: operationResult.operation,
      detectedColumn: columnResult.column
    },
    finalSource: 'rule-based'
  };
  
  // If rule-based detection has low confidence, try AI
  if (operationResult.confidence < 0.7 || columnResult.confidence < 0.7) {
    console.log('Low confidence detected, trying AI fallback...');
    try {
      const aiResult = await extractIntent(input, availableColumns, Object.keys(operationSynonyms));
      console.log('AI detection result:', aiResult);
      
      Object.assign(debug, {
        ai: {
          confidence: aiResult.confidence,
          detectedOperation: aiResult.operation,
          detectedColumn: aiResult.column
        },
        finalSource: aiResult.confidence > Math.max(operationResult.confidence, columnResult.confidence) ? 'ai' : 'rule-based'
      });
      
      // Use AI results if they have higher confidence
      if (aiResult.confidence > Math.max(operationResult.confidence, columnResult.confidence)) {
        console.log('Using AI result due to higher confidence');
        return {
          operation: aiResult.operation,
          column: aiResult.column,
          confidence: aiResult.confidence,
          alternatives: {
            operations: operationResult.alternatives,
            columns: columnResult.alternatives
          },
          context: {
            ...context,
            lastOperation: aiResult.operation || context.lastOperation,
            lastColumn: aiResult.column || context.lastColumn,
            conversationHistory: [
              ...(context.conversationHistory || []),
              {
                input,
                operation: aiResult.operation || 'unknown',
                column: aiResult.column || 'unknown',
                timestamp: new Date()
              }
            ].slice(-10)
          },
          suggestions: generateSmartSuggestions(
            input,
            aiResult.operation,
            aiResult.column,
            availableColumns,
            context
          ),
          intentType: detectIntentType(input),
          parameters: extractParameters(input),
          debug
        };
      } else {
        console.log('Using rule-based result due to higher confidence');
      }
    } catch (error) {
      console.error('AI fallback failed:', error);
    }
  }
  
  // Handle contextual references
  let finalColumn = columnResult.column;
  let finalOperation = operationResult.operation;
  
  // Context-based resolution
  if (!finalColumn && /\b(that|this|it|same)\b/i.test(input)) {
    finalColumn = context.lastColumn || null;
  }
  
  if (!finalOperation && /\b(again|same|repeat)\b/i.test(input)) {
    finalOperation = context.lastOperation || null;
  }
  
  // Detect intent type
  const intentType = detectIntentType(input);
  
  // Extract parameters
  const parameters = extractParameters(input);
  
  // Generate suggestions
  const suggestions = generateSmartSuggestions(
    input, 
    finalOperation, 
    finalColumn, 
    availableColumns,
    context
  );
  
  // Update conversation context
  const newContext: ConversationContext = {
    ...context,
    lastOperation: finalOperation || context.lastOperation,
    lastColumn: finalColumn || context.lastColumn,
    conversationHistory: [
      ...(context.conversationHistory || []),
      {
        input,
        operation: finalOperation || 'unknown',
        column: finalColumn || 'unknown',
        timestamp: new Date()
      }
    ].slice(-10) // Keep last 10 interactions
  };
  
  const overallConfidence = Math.min(
    operationResult.confidence + columnResult.confidence,
    1.0
  );
  
  return {
    operation: finalOperation,
    column: finalColumn,
    confidence: overallConfidence,
    alternatives: {
      operations: operationResult.alternatives,
      columns: columnResult.alternatives
    },
    context: newContext,
    suggestions,
    intentType,
    parameters
  };
};

// Detect user intent type
const detectIntentType = (input: string): 'question' | 'command' | 'clarification' | 'comparison' => {
  const normalized = input.toLowerCase();
  
  if (/^(what|how|when|where|why|which|who)/i.test(input)) {
    return 'question';
  }
  
  if (/\b(vs|versus|against|compare|difference)\b/i.test(normalized)) {
    return 'comparison';
  }
  
  if (/\b(yes|no|correct|wrong|that one|this one)\b/i.test(normalized)) {
    return 'clarification';
  }
  
  return 'command';
};

// Extract parameters from user input
interface ExtractedParameters extends Parameters {
  numbers?: number[];
  percentile?: number;
  topN?: number;
  bottomN?: number;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
  dateRange?: 'today' | 'yesterday' | 'last week' | 'last month' | 'last year';
}

const extractParameters = (input: string): ExtractedParameters => {
  const params: ExtractedParameters = {};
  
  // Extract numbers
  const numberMatches = input.match(/\d+/g);
  if (numberMatches) {
    params.numbers = numberMatches.map(Number);
  }
  
  // Extract percentiles
  const percentileMatch = input.match(/(\d+)(?:th|st|nd|rd)?\s*percentile/i);
  if (percentileMatch) {
    params.percentile = parseInt(percentileMatch[1], 10);
  }
  
  // Extract top/bottom N
  const topMatch = input.match(/top\s*(\d+)/i);
  const bottomMatch = input.match(/bottom\s*(\d+)/i);
  if (topMatch) params.topN = parseInt(topMatch[1], 10);
  if (bottomMatch) params.bottomN = parseInt(bottomMatch[1], 10);
  
  // Extract comparison operators
  const operatorMatch = input.match(/[><=!]+/);
  if (operatorMatch) {
    const op = operatorMatch[0] as ExtractedParameters['operator'];
    if (op === '>' || op === '<' || op === '>=' || op === '<=' || op === '=' || op === '!=') {
      params.operator = op;
    }
  }
  
  // Extract date ranges
  const dateWords = [
    'today', 'yesterday', 'last week', 'last month', 'last year'
  ] as const;
  
  for (const dateWord of dateWords) {
    if (input.toLowerCase().includes(dateWord)) {
      params.dateRange = dateWord;
      break;
    }
  }
  
  return params;
};

// Generate comprehensive clarification prompts
export const generateClarificationPrompt = (
  availableColumns: string[],
  partialMatch?: string,
  operationAlternatives?: string[],
  columnAlternatives?: string[]
): string => {
  let prompt = '';
  
  if (columnAlternatives && columnAlternatives.length > 0) {
    prompt += `Did you mean one of these columns? ${columnAlternatives.map(s => `'${s}'`).join(', ')}\n`;
  } else if (partialMatch) {
    const suggestions = availableColumns
      .filter(col => col.toLowerCase().includes(partialMatch.toLowerCase()))
      .slice(0, 5);
      
    if (suggestions.length > 0) {
      prompt += `Did you mean one of these columns? ${suggestions.map(s => `'${s}'`).join(', ')}\n`;
    }
  }
  
  if (operationAlternatives && operationAlternatives.length > 0) {
    prompt += `Or did you want to: ${operationAlternatives.join(', ')}?\n`;
  }
  
  if (!prompt) {
    prompt = `Available columns are: ${availableColumns.slice(0, 10).map(c => `'${c}'`).join(', ')}`;
    if (availableColumns.length > 10) {
      prompt += ` (and ${availableColumns.length - 10} more)`;
    }
  }
  
  return prompt.trim();
};

// Generate smart contextual suggestions
const generateSmartSuggestions = (
  input: string,
  operation: string | null,
  column: string | null,
  availableColumns: string[],
  context: ConversationContext
): string[] => {
  const suggestions: string[] = [];
  
  // Operation-specific suggestions
  if (operation && column) {
    const operationSuggestions = getOperationSuggestions(operation, column, availableColumns);
    suggestions.push(...operationSuggestions);
  }
  
  // Context-based suggestions
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    const recentOperations = context.conversationHistory
      .slice(-3)
      .map(h => h.operation)
      .filter((op, idx, arr) => arr.indexOf(op) === idx);
    
    suggestions.push(`You can also try: ${recentOperations.join(', ')}`);
  }
  
  // Column-specific suggestions
  if (column && !operation) {
    suggestions.push(`For '${column}', you could find: average, distribution, outliers, or correlations`);
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
};

// Get operation-specific suggestions
const getOperationSuggestions = (
  operation: string,
  column: string,
  availableColumns: string[]
): string[] => {
  const suggestions: Record<string, string[]> = {
    average: [
      `Also check the median and mode for '${column}'`,
      `Look for outliers in '${column}' that might affect the average`,
      `Compare with other columns: ${availableColumns.slice(0, 3).join(', ')}`
    ],
    correlation: [
      `Create a scatter plot to visualize the relationship`,
      `Check correlation with: ${availableColumns.slice(0, 3).join(', ')}`,
      `Look for non-linear relationships with residual plots`
    ],
    distribution: [
      `Identify outliers in this distribution`,
      `Check if the distribution is normal`,
      `Compare distribution across categories`
    ],
    count: [
      `Find unique values in '${column}'`,
      `Check for missing values`,
      `Group by '${column}' to see frequency distribution`
    ],
    maximum: [
      `Find the minimum value for comparison`,
      `Check what percentile this maximum represents`,
      `Identify outliers beyond this maximum`
    ],
    minimum: [
      `Find the maximum value for comparison`,
      `Check what percentile this minimum represents`,
      `Look for data quality issues with this minimum`
    ]
  };
  
  return suggestions[operation] || [];
};

// Enhanced response enhancement with multiple suggestion types
export const addContextualSuggestions = (
  response: string,
  operation: string,
  column: string,
  confidence: number,
  availableColumns: string[]
): string => {
  let enhancedResponse = response;
  
  // Add confidence indicator
  if (confidence < 0.7) {
    enhancedResponse += `\n\n⚠️ I'm ${Math.round(confidence * 100)}% confident about this interpretation.`;
  }
  
  // Add operation-specific suggestions
  const suggestions = getOperationSuggestions(operation, column, availableColumns);
  if (suggestions.length > 0) {
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    enhancedResponse += `\n\n💡 ${randomSuggestion}`;
  }
  
  // Add follow-up questions
  const followUpQuestions = generateFollowUpQuestions(operation, column);
  if (followUpQuestions.length > 0) {
    const randomQuestion = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
    enhancedResponse += `\n\n❓ ${randomQuestion}`;
  }
  
  return enhancedResponse;
};

// Generate follow-up questions
const generateFollowUpQuestions = (operation: string, column: string): string[] => {
  const questions: Record<string, string[]> = {
    average: [
      `Would you like to see how the ${column} average compares to the median?`,
      `Should I check for outliers in ${column} that might skew this average?`,
      `Want to see the ${column} average broken down by categories?`
    ],
    correlation: [
      `Would you like to see a scatter plot of this ${column} relationship?`,
      `Should I check for other variables strongly correlated with ${column}?`,
      `Want to explore non-linear relationships with ${column}?`
    ],
    distribution: [
      `Would you like to see basic statistics for the ${column} distribution?`,
      `Should I identify any outliers in ${column}?`,
      `Want to test if ${column} follows a normal distribution?`
    ],
    count: [
      `Would you like to see the unique values in ${column}?`,
      `Should I check for missing data in ${column}?`,
      `Want to see the ${column} count broken down by categories?`
    ]
  };
  
  return questions[operation] || [];
};

// Export utility functions for advanced usage
export const utils = {
  levenshteinDistance,
  calculateSynonymScore,
  detectCompoundOperations,
  detectIntentType,
  extractParameters,
  generateSmartSuggestions,
  getOperationSuggestions,
  generateFollowUpQuestions
};