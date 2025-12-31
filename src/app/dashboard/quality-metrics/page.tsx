'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import SimpleAIChatbot from '@/components/SimpleAIChatbot';

interface Dataset {
    _id: string;
    name: string;
    columns: Array<{
        name: string;
        type: 'numeric' | 'text' | 'date';
    }>;
    data: Record<string, string | number>[];
}

interface StatisticalSummary {
    mean: number;
    median: number;
    std: number;
}

interface MetricDetail {
    count?: number;
    total?: number;
    pct?: number;
    distribution?: Record<string, number>;
    imbalance_score?: number;
}

interface Metrics {
    Missing_Values: MetricDetail;
    Duplicate_Records: MetricDetail;
    Invalid_Data: MetricDetail;
    Outlier_Count: MetricDetail;
    Inconsistent_Formats: MetricDetail;
    Cardinality_Uniqueness: MetricDetail;
    Class_Imbalance: MetricDetail;
    Data_Type_Mismatch: MetricDetail;
    Feature_Correlation: MetricDetail;
    Low_Variance_Features: MetricDetail;
    Mean_Median_Drift: MetricDetail;
    Range_Violations: MetricDetail;
    Statistical_Summaries: Record<string, StatisticalSummary>;
}

const METRIC_LABELS: Record<keyof Omit<Metrics, 'Statistical_Summaries'>, string> = {
    Missing_Values: 'Missing Values',
    Duplicate_Records: 'Duplicate Records',
    // Invalid_Data: 'Invalid Data',
    Outlier_Count: 'Outlier Count',
    Inconsistent_Formats: 'Inconsistent Formats',
    Cardinality_Uniqueness: 'Cardinality/Uniqueness',
    // Class_Imbalance: 'Class Imbalance',
    Data_Type_Mismatch: 'Data Type Mismatch',
    // Feature_Correlation: 'Feature Correlation',
    // Low_Variance_Features: 'Low Variance Features',
    // Mean_Median_Drift: 'Mean-Median Drift',
    // Range_Violations: 'Range Violations',
};

// Function to log chat conversation to n8n webhook
const logChatToWebhook = async (question: string, answer: string) => {
    try {
        await fetch("https://n8n.editwithsanjay.in/webhook/log-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: question, answer: answer })
        });
        console.log('Chat logged to n8n successfully');
    } catch (error) {
        console.error('Failed to log chat to n8n:', error);
        // Don't show error to user as this is background logging
    }
};

function stripMarkdown(text: string): string {
    return text
        .replace(/[#*_`~\-]+/g, '')
        .replace(/\n{2,}/g, '\n')
        .replace(/^\s+|\s+$/gm, '')
        .trim();
}

export default function QualityMetrics() {
    const { data: session } = useSession();
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    // Removed unused showCardinalityMore state
    const [showImbalanceMore, setShowImbalanceMore] = useState(false);
    const [aiInsights, setAiInsights] = useState<string[]>([]); // Array of per-metric insights
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiProgress, setAiProgress] = useState(0);

    useEffect(() => {
        const fetchDatasets = async () => {
            if (session?.user?.id) {
                try {
                    setIsLoading(true);
                    const response = await fetch('/api/datasets');
                    if (!response.ok) {
                        throw new Error('Failed to fetch datasets');
                    }
                    const data = await response.json();
                    setDatasets(data);
                } catch {
                    setError('Failed to fetch datasets. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchDatasets();
    }, [session?.user?.id]);

    const downloadCSV = () => {
        if (!metrics || !currentDataset) return;

        const metricsData = [];
        metricsData.push(['S.No', 'Metric Name', 'Count/Distribution', 'Total', 'Percentage/Score']);

        (Object.keys(METRIC_LABELS) as (keyof Omit<Metrics, 'Statistical_Summaries'>)[]).forEach((key, idx) => {
            const detail = metrics[key];
            let countValue = '';
            let totalValue = '';
            let pctValue = '';

            if (key === 'Class_Imbalance') {
                if (detail.distribution) {
                    countValue = Object.entries(detail.distribution).map(([cls, cnt]) => `${cls}: ${cnt}`).join(', ');
                }
                pctValue = detail.imbalance_score !== undefined ? detail.imbalance_score.toFixed(4) : 'N/A';
            } else {
                countValue = detail.count !== undefined ? String(detail.count) : 'N/A';
                totalValue = detail.total !== undefined ? String(detail.total) : 'N/A';
                pctValue = detail.pct !== undefined ? detail.pct.toFixed(2) + '%' : 'N/A';
            }

            metricsData.push([idx + 1, METRIC_LABELS[key], countValue, totalValue, pctValue]);
        });

        metricsData.push(['', '', '', '', '']);
        metricsData.push(['Statistical Summaries', '', '', '', '']);
        metricsData.push(['Column', 'Mean', 'Median', 'Std Dev', '']);

        Object.entries(metrics.Statistical_Summaries).forEach(([col, vals]) => {
            metricsData.push([col, vals.mean.toFixed(4), vals.median.toFixed(4), vals.std.toFixed(4), '']);
        });

        const csvContent = metricsData.map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `quality-metrics-${currentDataset.name}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Report downloaded successfully');
    };

    const handleDatasetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selected = datasets.find(d => d._id === selectedId);
        if (selected) {
            setCurrentDataset(selected);
            setIsLoading(true);
            setError('');
            try {
                const mongoResponse = await fetch(`/api/metrics/get?userId=${session?.user?.id}&datasetId=${selected._id}`);
                const data = await mongoResponse.json();
                if (mongoResponse.ok && data.success && data.metrics) {
                    setMetrics(data.metrics as Metrics);
                    toast.success('Loaded metrics from cache');
                } else {
                    toast.loading('Calculating new metrics...', { duration: 3000 });
                    const headers = selected.columns.map(col => col.name).join(',') + '\n';
                    const rows = selected.data.map(row =>
                        selected.columns.map(col => {
                            const value = row[col.name];
                            if (typeof value === 'string') {
                                return `"${value.replace(/"/g, '""')}"`;
                            }
                            return value;
                        }).join(',')
                    ).join('\n');
                    const csvData = headers + rows;
                    const flaskResponse = await fetch('https://ml-backend-codes.streamlit.app/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            datasetId: selected._id,
                            datasetName: selected.name,
                            csvData,
                            targetColumn: null
                        }),
                    });
                    if (!flaskResponse.ok) throw new Error('Failed to generate metrics from backend');
                    const result = await flaskResponse.json();
                    if (!result.success) throw new Error(result.error || 'Failed to analyze dataset');
                    setMetrics(result.metrics as Metrics);
                    toast.success('Generated new metrics');
                }
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to process dataset');
                setMetrics(null);
                toast.error(error instanceof Error ? error.message : 'Failed to process dataset');
            } finally {
                setIsLoading(false);
            }
        } else {
            setCurrentDataset(null);
            setMetrics(null);
        }
    };

    // Groq API call for a single metric
    const getSingleMetricInsight = async (
        metricName: string,
        metricScore: string,
        statsText: string,
        shapeText: string
    ): Promise<string> => {
        const prompt = `You are an expert data scientist. For the following data quality metric, provide:\n- A short AI opinion on the metric's value\n- How to improve or preprocess if needed\nFormat your answer as:\nMetric Name: ${metricName}\nMetric Score: ${metricScore}\nAI Opinion: ...\nHow to improve or preprocess: ...\n\nStatistical Summaries:\n${statsText}\n\nDataset Shape: ${shapeText}`;
        const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                temperature: 0.3,
                max_tokens: 300,
                top_p: 0.8,
                messages: [
                    { role: 'system', content: 'You are an expert data scientist. Provide clear, actionable, and concise insights.' },
                    { role: 'user', content: prompt }
                ]
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to get AI insights');
        }
        const data = await response.json();
        return stripMarkdown(data.choices?.[0]?.message?.content || 'No insights returned.');
    };

    // Get AI Insights for all metrics, one by one
    const getAIInsights = async () => {
        if (!metrics || !currentDataset) return;
        setLoadingAI(true);
        setAiError('');
        setAiInsights([]);
        setAiProgress(0);
        try {
            const statsText = Object.entries(metrics.Statistical_Summaries)
                .map(([col, vals]) => `${col}: mean=${vals.mean.toFixed(4)}, median=${vals.median.toFixed(4)}, std=${vals.std.toFixed(4)}`)
                .join('\n');
            const shapeText = `Rows: ${currentDataset.data.length}, Columns: ${currentDataset.columns.length}`;
            const metricKeys = Object.keys(METRIC_LABELS) as (keyof Omit<Metrics, 'Statistical_Summaries'>)[];
            const insights: string[] = [];
            for (let i = 0; i < metricKeys.length; i++) {
                const key = metricKeys[i];
                const detail = metrics[key];
                let score = '';
                if (key === 'Class_Imbalance') {
                    score = detail.imbalance_score !== undefined ? detail.imbalance_score.toFixed(4) : 'N/A';
                } else {
                    score = detail.pct !== undefined ? detail.pct.toFixed(2) + '%' : 'N/A';
                }
                setAiProgress(i + 1);
                const insight = await getSingleMetricInsight(METRIC_LABELS[key], score, statsText, shapeText);
                insights.push(insight);
            }
            setAiInsights(insights);
            toast.success('AI Insights generated!');
            // Log to n8n webhook (send all insights as one answer)
            const question = metricKeys.map((key, idx) => `${idx + 1}. ${METRIC_LABELS[key]}`).join('\n');
            logChatToWebhook(question, insights.join('\n\n'));
        } catch (err) {
            setAiError(err instanceof Error ? err.message : 'Failed to get AI insights');
            toast.error('Failed to get AI insights');
        } finally {
            setLoadingAI(false);
            setAiProgress(0);
        }
    };

    // Download AI Insights as .txt
    const downloadAIInsights = () => {
        if (!aiInsights.length) return;
        const blob = new Blob([aiInsights.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-insights-${currentDataset?.name || 'dataset'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('AI Insights downloaded!');
    };

    if (isLoading && !currentDataset) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-700 font-medium">Loading datasets...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto py-6 px-4 max-w-7xl">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Quality Metrics Report</h1>
                            <p className="text-gray-600">Comprehensive analysis of dataset quality metrics</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 min-w-64">
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium"
                                    value={currentDataset?._id || ''}
                                    onChange={handleDatasetChange}
                                >
                                    <option value="">Choose a dataset to analyze</option>
                                    {datasets.map((dataset) => (
                                        <option key={dataset._id} value={dataset._id}>
                                            {dataset.name} ({dataset._id.substring(0, 8)}...)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                {currentDataset && metrics && (
                                    <button
                                        onClick={downloadCSV}
                                        className="inline-flex items-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium"
                                    >
                                        Download CSV
                                    </button>
                                )}
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
                                >
                                    Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {datasets.length > 0 ? (
                    <div className="space-y-6">
                        {currentDataset && metrics && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Quality Metrics Table */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Quality Metrics</h2>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">S.No</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Metric Name</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Count</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Total</th>
                                                    {/* <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Percentage</th> */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(Object.keys(METRIC_LABELS) as (keyof Omit<Metrics, 'Statistical_Summaries'>)[]).map((key, idx) => {
                                                    const detail = metrics[key];
                                                    let countCell = '';
                                                    let totalCell = '';
                                                    // let pctCell = '';

                                                    if (key === 'Class_Imbalance') {
                                                        if (detail.distribution) {
                                                            const entries = Object.entries(detail.distribution);
                                                            countCell = entries.slice(0, 2).map(([cls, cnt]) => `${cls}: ${cnt}`).join(', ');
                                                            if (entries.length > 2) {
                                                                countCell += showImbalanceMore ? ', ' + entries.slice(2).map(([cls, cnt]) => `${cls}: ${cnt}`).join(', ') : '...';
                                                            }
                                                        }
                                                        totalCell = '';
                                                        // pctCell = detail.imbalance_score !== undefined ? detail.imbalance_score.toFixed(4) : 'N/A';
                                                    } else {
                                                        countCell = detail.count !== undefined ? String(detail.count) : 'N/A';
                                                        totalCell = detail.total !== undefined ? String(detail.total) : 'N/A';
                                                        // pctCell = detail.pct !== undefined ? detail.pct.toFixed(2) + '%' : 'N/A';
                                                    }

                                                    return (
                                                        <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-3 text-gray-900 text-sm">{idx + 1}</td>
                                                            <td className="px-4 py-3 font-medium text-gray-900 text-sm">{METRIC_LABELS[key]}</td>
                                                            <td className="px-4 py-3 text-gray-900 text-sm">
                                                                {countCell}
                                                                {key === 'Class_Imbalance' && detail.distribution && Object.keys(detail.distribution).length > 2 && (
                                                                    <button
                                                                        onClick={() => setShowImbalanceMore(!showImbalanceMore)}
                                                                        className="text-blue-600 text-xs ml-2 underline"
                                                                    >
                                                                        {showImbalanceMore ? 'less' : 'more'}
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-900 text-sm">{totalCell}</td>
                                                            {/* <td className="px-4 py-3 text-gray-900 text-sm">{pctCell}</td> */}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Statistical Summaries Table */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistical Summaries</h2>
                                    {Object.keys(metrics.Statistical_Summaries).length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-gray-500 font-medium">No numerical columns found</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full">
                                                <thead>
                                                    <tr className="border-b border-gray-200">
                                                        <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Column</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Mean</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Median</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm">Std Dev</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(metrics.Statistical_Summaries).map(([col, vals], i) => (
                                                        <tr key={col} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-3 font-medium text-gray-900 text-sm">{col}</td>
                                                            <td className="px-4 py-3 text-gray-900 text-sm">{vals.mean.toFixed(4)}</td>
                                                            <td className="px-4 py-3 text-gray-900 text-sm">{vals.median.toFixed(4)}</td>
                                                            <td className="px-4 py-3 text-gray-900 text-sm">{vals.std.toFixed(4)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Insights Section */}
                        {currentDataset && metrics && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={getAIInsights}
                                            disabled={loadingAI}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-60"
                                        >
                                            {loadingAI ? `Generating... (${aiProgress}/12)` : 'Get AI Insights'}
                                        </button>
                                        {aiInsights.length > 0 && (
                                            <button
                                                onClick={downloadAIInsights}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium"
                                            >
                                                Download Insights
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {aiError && (
                                    <div className="text-red-600 font-medium mb-4">{aiError}</div>
                                )}
                                {loadingAI && (
                                    <div className="text-gray-700 font-medium">Generating AI insights, please wait...</div>
                                )}
                                {aiInsights.length > 0 && (
                                    <div className="space-y-6 mt-4">
                                        {aiInsights.map((section, idx) => (
                                            <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="text-lg font-bold text-purple-800 mb-2">{METRIC_LABELS[Object.keys(METRIC_LABELS)[idx] as keyof typeof METRIC_LABELS]}</div>
                                                {section.split('\n').map((line, i) => (
                                                    <div key={i} className="text-gray-900 text-base leading-relaxed mb-1">
                                                        {line}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentDataset && !metrics && isLoading && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                                <p className="text-gray-700 font-medium">Analyzing dataset metrics...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Datasets Found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Upload datasets to start analyzing their quality metrics.
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                )}
            </div>

            {/* AI Chatbot */}
            <SimpleAIChatbot />
        </div>
    );
}