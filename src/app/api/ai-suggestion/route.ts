import { NextRequest, NextResponse } from 'next/server';

// GROQ API configuration
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || 'sk-groq-v1-61667ef03a97f5261b201fe14b96f0cca1202bdb7a0ae51965090e15eeee8368';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface AIRecommendationRequest {
  dataset: {
    name: string;
    analysisType: string;
    rowCount: number;
    columnCount: number;
    fileSize: number;
    features: string[];
    target: string;
    processingSteps: string[];
  };
  dataPreview: {
    headers: string[];
    rows: string[][];
  };
}

interface AIRecommendationResponse {
  recommendedModel: string;
  confidence: number;
  reasoning: string;
  alternativeModels: string[];
  recommendedSplit: {
    train: number;
    test: number;
    validation?: number;
  };
  hyperparameterSuggestions: Record<string, string | number | boolean>;
  dataInsights: string[];
  expectedPerformance: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle simple prompt-based requests (backward compatibility)
    if ('prompt' in body && typeof body.prompt === 'string') {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ 
            role: 'user', 
            content: body.prompt 
          }],
          max_tokens: 150,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error('Groq API error');
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content || 'Unable to generate suggestion';
      
      return NextResponse.json({ 
        suggestion: suggestion.trim(),
        success: true 
      });
    }

    // Enhanced ML recommendation logic
    const { dataset, dataPreview }: AIRecommendationRequest = body;
    
    if (!dataset || !dataPreview) {
      return NextResponse.json(
        { error: 'Dataset and dataPreview are required for ML recommendations' },
        { status: 400 }
      );
    }

    // Create comprehensive prompt for ML recommendations
    const prompt = `
You are an expert ML engineer. Analyze this dataset and provide model recommendations in valid JSON format.

Dataset Information:
- Name: ${dataset.name}
- Analysis Type: ${dataset.analysisType}
- Rows: ${dataset.rowCount?.toLocaleString() || 'Unknown'}
- Columns: ${dataset.columnCount}
- File Size: ${(dataset.fileSize / 1024 / 1024).toFixed(2)} MB
- Features: ${dataset.features.length} selected features (${dataset.features.join(', ')})
- Target: ${dataset.target}
- Processing Steps: ${dataset.processingSteps.join(', ')}

Sample Data (first 5 rows):
Headers: ${dataPreview.headers.join(', ')}
${dataPreview.rows.slice(0, 5).map(row => row.join(', ')).join('\n')}

Available Models:
- random_forest: Ensemble method, good for most problems
- xgboost: Gradient boosting, excellent performance  
- logistic_regression: Linear classifier, interpretable
- linear_regression: Linear regression for continuous targets
- svm: Support Vector Machine, good for complex boundaries
- kmeans: Unsupervised clustering
- dbscan: Density-based clustering
- isolation_forest: Anomaly detection

Respond with valid JSON only:
{
  "recommendedModel": "model_name",
  "confidence": 0.85,
  "reasoning": "Why this model is recommended",
  "alternativeModels": ["model2", "model3"],
  "recommendedSplit": {"train": 0.7, "test": 0.2, "validation": 0.1},
  "hyperparameterSuggestions": {"n_estimators": 100, "max_depth": 10},
  "dataInsights": ["insight1", "insight2"],
  "expectedPerformance": "Expected accuracy: 85-90%"
}
`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error('Groq API error');
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI service');
    }

    // Try to parse JSON response
    let aiRecommendation: AIRecommendationResponse;
    try {
      aiRecommendation = JSON.parse(responseText);
    } catch {
      throw new Error('Invalid JSON response from AI');
    }

    // Validate required fields
    if (!aiRecommendation.recommendedModel || !aiRecommendation.reasoning) {
      throw new Error('Invalid AI response structure');
    }

    return NextResponse.json(aiRecommendation);

  } catch (error) {
    console.error('AI Suggestion API Error:', error);
    
    // Fallback recommendation
    const fallbackRecommendation: AIRecommendationResponse = {
      recommendedModel: 'random_forest',
      confidence: 0.7,
      reasoning: 'Fallback recommendation: Random Forest is a robust ensemble method that works well for most problems.',
      alternativeModels: ['xgboost', 'logistic_regression'],
      recommendedSplit: {
        train: 0.7,
        test: 0.2,
        validation: 0.1
      },
      hyperparameterSuggestions: {
        n_estimators: 100,
        max_depth: 10,
        random_state: 42
      },
      dataInsights: [
        'Using fallback analysis due to AI service unavailability',
        'Random Forest is recommended as a safe default choice'
      ],
      expectedPerformance: 'Expected performance: Good baseline results'
    };

    return NextResponse.json(fallbackRecommendation);
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'AI Suggestion API is running. Use POST method to get recommendations.',
    availableModels: [
      'random_forest', 'xgboost', 'logistic_regression', 'linear_regression',
      'svm', 'kmeans', 'dbscan', 'isolation_forest'
    ]
  });
}
