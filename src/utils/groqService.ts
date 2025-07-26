// Groq API utility for generating intelligent metric explanations

export const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface MetricExplanation {
  metric: string;
  value: number | string;
  explanation: string;
  recommendation: string;
}

export const generateMetricExplanation = async (
  metric: string, 
  value: number | string, 
  modelType: string = 'random_forest',
  taskType: 'classification' | 'regression' = 'classification'
): Promise<string | null> => {
  if (!GROQ_API_KEY) {
    console.warn('Groq API key not found');
    return null;
  }

  try {
    const concisePrompt = `Explain this ML metric in 1-2 sentences for a non-technical user:
Metric: ${metric}
Value: ${value}
Model: ${modelType}
Task: ${taskType}

Focus on what this value means and if it's good/bad/average. Keep it simple and actionable.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: concisePrompt }],
        max_tokens: 300,
        temperature: 0.7,
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

export const generateModelSummary = async (
  metrics: Record<string, unknown>,
  modelType: string,
  taskType: 'classification' | 'regression'
): Promise<string | null> => {
  if (!GROQ_API_KEY) {
    return null;
  }

  try {
    const metricsText = Object.entries(metrics)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const prompt = `Summarize this ML model performance in 2-3 sentences for a business user:
Model: ${modelType}
Task: ${taskType}
Metrics: ${metricsText}

Explain if this model is performing well and what it means for practical use.`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.7,
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

// Fallback explanations for when Groq API is not available
export const getFallbackExplanation = (metric: string, value: number | string): string => {
  const explanations: Record<string, string> = {
    'accuracy': `Accuracy of ${value} means the model correctly predicts ${(Number(value) * 100).toFixed(1)}% of cases.`,
    'f1_score': `F1 Score of ${value} balances precision and recall - closer to 1.0 is better.`,
    'precision': `Precision of ${value} means ${(Number(value) * 100).toFixed(1)}% of positive predictions are correct.`,
    'recall': `Recall of ${value} means the model finds ${(Number(value) * 100).toFixed(1)}% of all positive cases.`,
    'r2_score': `R² Score of ${value} means the model explains ${(Number(value) * 100).toFixed(1)}% of data variance.`,
    'mse': `Mean Squared Error of ${value} - lower values indicate better predictions.`,
    'mae': `Mean Absolute Error of ${value} - average prediction error magnitude.`,
    'roc_auc': `ROC AUC of ${value} - model's ability to distinguish between classes.`
  };

  return explanations[metric] || `${metric}: ${value}`;
};
