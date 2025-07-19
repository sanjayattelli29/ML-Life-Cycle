import React, { useState } from 'react';

interface MistralInsightsProps {
  metrics: Record<string, number>;
  overallScore: number;
  topIssues: Record<string, number>;
  currentDatasetId?: string;
  userId?: string;
}

const MistralInsights: React.FC<MistralInsightsProps> = ({ 
  metrics, 
  overallScore, 
  topIssues, 
  currentDatasetId, 
  userId 
}) => {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Function to fetch metrics from MongoDB
  const fetchMetricsFromMongoDB = async (): Promise<Record<string, number>> => {
    if (!currentDatasetId || !userId) {
      console.log('Using fallback metrics - no dataset/user ID provided');
      return metrics;
    }

    try {
      const response = await fetch(`/api/metrics/get?userId=${userId}&datasetId=${currentDatasetId}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.metrics) {
        console.log('Successfully fetched metrics from MongoDB:', data.metrics);
        
        // Convert string values to numbers for metrics that should be numeric
        const numericMetrics: Record<string, number> = {};
        Object.entries(data.metrics).forEach(([key, value]) => {
          if (typeof value === 'string' && !isNaN(Number(value))) {
            numericMetrics[key] = Number(value);
          } else if (typeof value === 'number') {
            numericMetrics[key] = value;
          }
        });
        
        return numericMetrics;
      } else {
        console.log('Failed to fetch from MongoDB, using fallback metrics');
        return metrics;
      }
    } catch (error) {
      console.error('Error fetching metrics from MongoDB:', error);
      return metrics;
    }
  };

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

  // Mistral API configuration
  const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
  const MISTRAL_API_KEY = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || '';

  const sendToMistral = async (message: string): Promise<string> => {
    try {
      const requestBody = {
        model: "mistral-small-latest",
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 4000,
        stream: false,
        messages: [
          {
            role: "system",
            content: "You are an expert data scientist and ML engineer. Provide comprehensive, well-structured analysis with clear sections and actionable recommendations. Format your response with numbered sections and bullet points for clarity."
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: {
          type: "text"
        }
      };

      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mistral API error: ${response.status} - ${errorData.message || 'Check your API configuration'}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Analysis completed';
    } catch (error) {
      console.error('Error calling Mistral API:', error);
      throw new Error('Unable to connect to Mistral AI. Please check your API key and configuration.');
    }
  };

  const formatAllMetrics = (metricsData: Record<string, number>) => {
    const allMetrics = Object.entries(metricsData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const topIssuesStr = Object.entries(topIssues)
      .map(([issue, score]) => `${issue}: ${score}`)
      .join(', ');

    return `
Act as an expert data scientist. Analyze this dataset and provide a comprehensive report with the following structure:

## Dataset Analysis Report

**Dataset Metrics:**
${allMetrics}

**Overall Quality Score:** ${overallScore}/100
**Top Issues Detected:** ${topIssuesStr}

Please provide detailed analysis in exactly these 4 sections:

### 1. Data Quality & Preprocessing Recommendations
- Identify specific data quality issues
- Recommend preprocessing steps (cleaning, transformation, feature engineering)
- Suggest handling methods for missing values, outliers, and inconsistencies

### 2. ML & DL Model Recommendations  
- Recommend suitable machine learning algorithms based on data characteristics
- Suggest deep learning architectures if applicable
- Explain why these models are appropriate for this dataset

### 3. Production Readiness Assessment
- Evaluate if the dataset is ready for production deployment
- Identify gaps that need to be addressed before production
- Recommend data validation and testing strategies

### 4. Monitoring & Alerts Strategy
- Define key metrics to monitor in production
- Set up data drift detection mechanisms  
- Recommend alert thresholds and monitoring dashboards

Provide specific, actionable recommendations for each section with clear explanations.
    `.trim();
  };

  const getAllInsights = async () => {
    setLoading(true);
    setError('');

    try {
      // First, fetch the latest metrics from MongoDB
      console.log('Fetching metrics from MongoDB for dataset:', currentDatasetId);
      const fetchedMetrics = await fetchMetricsFromMongoDB();
      
      console.log('Using metrics for analysis:', fetchedMetrics);
      
      const fullPrompt = formatAllMetrics(fetchedMetrics);
      const response = await sendToMistral(fullPrompt);
      setInsights(response);
      
      // Log the conversation to n8n webhook
      const question = "Generate comprehensive dataset analysis with preprocessing recommendations, ML model suggestions, production readiness assessment, and monitoring strategy";
      logChatToWebhook(question, response);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get insights';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearInsights = () => {
    setInsights('');
    setError('');
  };

  const downloadInsights = () => {
    if (!insights) return;
    
    const cleanText = insights.replace(/\*\*/g, '').replace(/\*/g, '');
    const blob = new Blob([cleanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-insights-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatInsightText = (text: string) => {
    // Clean up the text
    const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
    
    // Split by sections (looking for numbered sections or ### headers)
    const sections = cleanText.split(/(?=###\s*\d+\.|(?=\d+\.\s*[A-Za-z]))/);
    
    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      if (!trimmedSection) return null;

      // Check if this is a header section
      const headerMatch = trimmedSection.match(/^(###\s*)?(\d+)\.\s*([A-Za-z\s&-]+)/);
      
      if (headerMatch) {
        const sectionNumber = headerMatch[2];
        const sectionTitle = headerMatch[3];
        const content = trimmedSection.replace(/^(###\s*)?\d+\.\s*[A-Za-z\s&-]+/, '').trim();
        
        return (
          <div key={index} className="mb-8">
            {/* Section Header */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-6 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{sectionNumber}</span>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {sectionTitle}
                </h3>
              </div>
            </div>
            
            {/* Section Content */}
            {content && (
              <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-6">
                {content.split('\n').map((line, lineIndex) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  
                  if (trimmedLine.match(/^[-•]\s*/)) {
                    return (
                      <div key={lineIndex} className="flex items-start gap-3 mb-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-slate-700 leading-relaxed">
                          {trimmedLine.replace(/^[-•]\s*/, '')}
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <p key={lineIndex} className="text-slate-700 leading-relaxed mb-3">
                      {trimmedLine}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      } else {
        // This is standalone content
        if (trimmedSection.length > 20) {
          return (
            <div key={index} className="mb-6">
              <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-6">
                {trimmedSection.split('\n').map((line, lineIndex) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return null;
                  
                  if (trimmedLine.match(/^[-•]\s*/)) {
                    return (
                      <div key={lineIndex} className="flex items-start gap-3 mb-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-slate-700 leading-relaxed">
                          {trimmedLine.replace(/^[-•]\s*/, '')}
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <p key={lineIndex} className="text-slate-700 leading-relaxed mb-3">
                      {trimmedLine}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        }
      }
      
      return null;
    }).filter(Boolean);
  };

  return (
    <div className="space-y-8">
      {/* Header Section - matching gen-z card style */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Dataset Insights Hub
          </h2>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Overall Score</h3>
            <p className="text-2xl font-bold text-slate-800">
              {overallScore.toFixed(1)}
            </p>
          </div>
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Metrics Count</h3>
            <p className="text-2xl font-bold text-slate-800">
              {Object.keys(metrics).length}
            </p>
          </div>
          <div className="backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Top Issues</h3>
            <p className="text-2xl font-bold text-slate-800">
              {Object.keys(topIssues).length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={getAllInsights}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Fetching & Analyzing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get AI Insights 
              </div>
            )}
          </button>

          {insights && (
            <>
              <button
                onClick={clearInsights}
                className="px-6 py-3 bg-slate-600 text-white rounded-xl font-semibold"
              >
                Clear Insights
              </button>
              <button
                onClick={downloadInsights}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download .txt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Insights Section */}
      {(insights || error) && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-8">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <span className="text-red-800 font-semibold">Error Getting Insights</span>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={getAllInsights}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <span className="text-xl font-bold text-slate-800">
                  AI Dataset Analysis Results
                </span>
              </div>
              
              <div className="space-y-4">
                {formatInsightText(insights)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* What You'll Get Section */}
      {!insights && !error && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">
            What You&apos;ll Get:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { num: '1', title: 'Preprocessing Recommendations', desc: 'Specific steps to clean and prepare your data', color: 'blue' },
              { num: '2', title: 'Model Suggestions', desc: 'Best ML/DL algorithms for your dataset', color: 'purple' },
              { num: '3', title: 'Production Readiness', desc: 'Assessment of deployment readiness', color: 'green' },
              { num: '4', title: 'Monitoring Strategy', desc: 'Key metrics and alerts to set up', color: 'orange' }
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-4 backdrop-blur-sm bg-white/70 rounded-2xl border border-white/20 p-6">
                <div className={`w-8 h-8 bg-gradient-to-r ${
                  item.color === 'blue' ? 'from-blue-500 to-indigo-500' :
                  item.color === 'purple' ? 'from-purple-500 to-violet-500' :
                  item.color === 'green' ? 'from-green-500 to-emerald-500' :
                  'from-orange-500 to-amber-500'
                } rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{item.num}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">{item.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MistralInsights;