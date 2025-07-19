"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  BarChart4,
  Binary,
  Calendar,
  FileText,
  GitCompare,
  Grid,
  Table,
  Waves,
  Sparkles,
  Database,
  Target,
  TrendingUp,
  Clock,
  Shield,
  Activity,
  Zap,
  Eye,
  CheckCircle,
  XCircle,
  Hash,
  Percent,
  RefreshCw,
  ArrowUpDown,
  Filter,
  PieChart,
  BarChart,
  LineChart,
  Globe,
  Lock,
  Gauge,
  Settings,
  Users,
  FileCheck,
  Layers,
  Scissors,
  BookOpen
} from "lucide-react";

export default function MetricsGuidePage() {
  const [activeTab, setActiveTab] = useState('core');

  const coreMetrics = [
    {
      title: "Data Quality Score",
      description: "Comprehensive assessment of dataset quality across multiple dimensions including completeness, accuracy, consistency, and validity",
      icon: <Sparkles className="h-6 w-6 text-purple-600" />,
      category: "Core Metrics",
      features: ["Completeness Analysis", "Accuracy Validation", "Consistency Checks", "Validity Assessment"],
      improvement: "92% average improvement in data reliability",
      formula: "DQS = (Completeness × 0.3) + (Accuracy × 0.3) + (Consistency × 0.25) + (Validity × 0.15)"
    },
    {
      title: "Missing Value Analysis",
      description: "Advanced detection and intelligent handling of missing data using statistical imputation techniques and pattern recognition",
      icon: <AlertCircle className="h-6 w-6 text-orange-600" />,
      category: "Data Completeness",
      features: ["Pattern Detection", "Smart Imputation", "Impact Analysis", "Missingness Mechanisms"],
      improvement: "85% reduction in missing values",
      formula: "Missing Rate = (Missing Values / Total Values) × 100"
    },
    {
      title: "Outlier Detection",
      description: "Multi-method anomaly detection using statistical and machine learning approaches to identify data points that deviate significantly",
      icon: <Waves className="h-6 w-6 text-blue-600" />,
      category: "Data Accuracy",
      features: ["Z-Score Analysis", "IQR Method", "Isolation Forest", "Local Outlier Factor"],
      improvement: "78% accuracy in outlier detection",
      formula: "Z-Score = (x - μ) / σ, where |Z| > 3 indicates outlier"
    },
    {
      title: "Type Inference",
      description: "Intelligent automatic detection and validation of optimal data types across all columns with format verification",
      icon: <Binary className="h-6 w-6 text-green-600" />,
      category: "Data Structure",
      features: ["Auto Detection", "Type Validation", "Format Checking", "Conversion Optimization"],
      improvement: "95% accuracy in type detection",
      formula: "Type Confidence = Correct Inferences / Total Columns"
    },
    {
      title: "Temporal Analysis",
      description: "Comprehensive time-based data validation including sequence verification, gap detection, and temporal consistency checks",
      icon: <Calendar className="h-6 w-6 text-red-600" />,
      category: "Time Series",
      features: ["Timeline Validation", "Sequence Verification", "Gap Analysis", "Temporal Consistency"],
      improvement: "89% improvement in temporal consistency",
      formula: "Temporal Consistency = Valid Sequences / Total Sequences"
    },
    {
      title: "Format Standardization",
      description: "Automated pattern recognition and standardization ensuring consistent formatting across similar data fields",
      icon: <FileText className="h-6 w-6 text-indigo-600" />,
      category: "Data Consistency",
      features: ["Pattern Matching", "Auto Correction", "Format Rules", "Standardization Templates"],
      improvement: "94% format consistency achieved",
      formula: "Format Consistency = Standardized Fields / Total Fields"
    },
    {
      title: "Correlation Analysis",
      description: "Advanced statistical analysis to identify linear and non-linear relationships between variables and feature dependencies",
      icon: <GitCompare className="h-6 w-6 text-yellow-600" />,
      category: "Feature Analysis",
      features: ["Pearson Correlation", "Spearman Rank", "Feature Importance", "Redundancy Detection"],
      improvement: "82% feature optimization",
      formula: "Pearson r = Σ[(xi - x̄)(yi - ȳ)] / √[Σ(xi - x̄)²Σ(yi - ȳ)²]"
    },
    {
      title: "Categorical Encoding",
      description: "Intelligent encoding strategies for categorical variables optimized for different analysis types and model requirements",
      icon: <Grid className="h-6 w-6 text-pink-600" />,
      category: "Data Transformation",
      features: ["One-Hot Encoding", "Label Encoding", "Target Encoding", "Feature Hashing"],
      improvement: "90% encoding efficiency",
      formula: "Encoding Efficiency = Optimal Encodings / Total Categorical Features"
    },
    {
      title: "Data Distribution",
      description: "Statistical analysis and optimization of numerical variable distributions including normality tests and transformation recommendations",
      icon: <BarChart4 className="h-6 w-6 text-cyan-600" />,
      category: "Statistical Analysis",
      features: ["Normality Testing", "Skewness Analysis", "Kurtosis Measurement", "Distribution Fitting"],
      improvement: "87% improvement in distribution balance",
      formula: "Skewness = E[(X - μ)³] / σ³"
    },
    {
      title: "Schema Validation",
      description: "Comprehensive validation ensuring data adherence to predefined schemas, business rules, and domain constraints",
      icon: <Table className="h-6 w-6 text-teal-600" />,
      category: "Data Integrity",
      features: ["Rule Validation", "Constraint Checking", "Schema Enforcement", "Business Logic Validation"],
      improvement: "96% schema compliance",
      formula: "Schema Compliance = Valid Records / Total Records"
    }
  ];

  const detailedMetrics = [
    {
      title: "Row Count",
      description: "Total number of records in the dataset",
      icon: "📊",
      category: "Basic Statistics",
      formula: "COUNT(*)",
      importance: "Foundation metric for dataset size assessment"
    },
    {
      title: "Column Count",
      description: "Total number of features/variables in the dataset",
      icon: "📋",
      category: "Basic Statistics", 
      formula: "COUNT(DISTINCT column_name)",
      importance: "Indicates dataset dimensionality"
    },
    {
      title: "File Size (MB)",
      description: "Physical storage size of the dataset",
      icon: "💾",
      category: "Storage Metrics",
      formula: "File Size = Total Bytes / (1024 × 1024)",
      importance: "Critical for storage and performance planning"
    },
    {
      title: "Numeric Columns Count",
      description: "Number of numerical features in the dataset",
      icon: "🔢",
      category: "Data Types",
      formula: "COUNT(columns WHERE type IN ('int', 'float', 'decimal'))",
      importance: "Determines statistical analysis capabilities"
    },
    {
      title: "Categorical Columns Count", 
      description: "Number of categorical/text features",
      icon: "🏷️",
      category: "Data Types",
      formula: "COUNT(columns WHERE type IN ('string', 'category', 'object'))",
      importance: "Indicates encoding and preprocessing needs"
    },
    {
      title: "Date Columns Count",
      description: "Number of temporal features in the dataset",
      icon: "📅",
      category: "Data Types",
      formula: "COUNT(columns WHERE type IN ('date', 'datetime', 'timestamp'))",
      importance: "Essential for time series analysis"
    },
    {
      title: "Missing Values Percentage",
      description: "Overall percentage of missing data across the dataset",
      icon: "❓",
      category: "Data Quality",
      formula: "Missing % = (Total Missing Values / Total Values) × 100",
      importance: "Key indicator of data completeness"
    },
    {
      title: "Duplicate Records Count",
      description: "Number of identical records in the dataset",
      icon: "👥",
      category: "Data Quality",
      formula: "Total Rows - COUNT(DISTINCT *)",
      importance: "Affects data integrity and analysis accuracy"
    },
    {
      title: "Outlier Rate",
      description: "Percentage of data points identified as outliers",
      icon: "🎯",
      category: "Data Quality",
      formula: "Outlier Rate = (Outlier Count / Total Records) × 100",
      importance: "Indicates data anomalies and quality issues"
    },
    {
      title: "Inconsistency Rate",
      description: "Percentage of data violating consistency rules",
      icon: "⚠️",
      category: "Data Quality",
      formula: "Inconsistency Rate = (Inconsistent Records / Total Records) × 100",
      importance: "Measures data standardization needs"
    },
    {
      title: "Data Type Mismatch Rate",
      description: "Percentage of values not conforming to expected types",
      icon: "🔄",
      category: "Data Quality",
      formula: "Mismatch Rate = (Type Mismatches / Total Values) × 100",
      importance: "Critical for data processing pipeline reliability"
    },
    {
      title: "Null vs NaN Distribution",
      description: "Ratio of null values to NaN values in numeric columns",
      icon: "📈",
      category: "Missing Data",
      formula: "NULL/NaN Ratio = NULL Count / NaN Count",
      importance: "Helps understand missingness patterns"
    },
    {
      title: "Cardinality Categorical",
      description: "Average number of unique values per categorical column",
      icon: "🎨",
      category: "Feature Analysis",
      formula: "Avg Cardinality = Σ(DISTINCT values per column) / Categorical Columns",
      importance: "Determines encoding strategy complexity"
    },
    {
      title: "Target Imbalance",
      description: "Measure of class distribution imbalance in target variable",
      icon: "⚖️",
      category: "Target Analysis",
      formula: "Imbalance Ratio = Majority Class / Minority Class",
      importance: "Critical for model performance and bias"
    },
    {
      title: "Feature Importance Consistency",
      description: "Stability of feature importance across different model runs",
      icon: "🎲",
      category: "Feature Analysis",
      formula: "Consistency = 1 - (StdDev of Importance Scores / Mean Importance)",
      importance: "Indicates feature reliability for modeling"
    },
    {
      title: "Class Overlap Score",
      description: "Measure of separability between different classes",
      icon: "🔍",
      category: "Classification",
      formula: "Overlap Score = Overlapping Instances / Total Instances",
      importance: "Predicts classification difficulty"
    },
    {
      title: "Label Noise Rate",
      description: "Percentage of incorrectly labeled instances",
      icon: "🔊",
      category: "Data Quality",
      formula: "Noise Rate = (Mislabeled Instances / Total Labeled) × 100",
      importance: "Affects supervised learning performance"
    },
    {
      title: "Feature Correlation Mean",
      description: "Average correlation coefficient between all feature pairs",
      icon: "🔗",
      category: "Feature Analysis",
      formula: "Mean Correlation = Σ|correlation(Xi, Xj)| / Number of Pairs",
      importance: "Indicates multicollinearity issues"
    },
    {
      title: "Range Violation Rate",
      description: "Percentage of values outside expected ranges",
      icon: "📏",
      category: "Data Validation",
      formula: "Range Violation = (Out of Range Values / Total Values) × 100",
      importance: "Measures domain constraint adherence"
    },
    {
      title: "Mean Median Drift",
      description: "Difference between mean and median indicating skewness",
      icon: "📊",
      category: "Distribution",
      formula: "Drift = |Mean - Median| / Standard Deviation",
      importance: "Indicates distribution asymmetry"
    },
    {
      title: "Data Freshness",
      description: "Age of the most recent data point",
      icon: "⏰",
      category: "Temporal",
      formula: "Freshness = Current Time - Max(Timestamp)",
      importance: "Critical for time-sensitive applications"
    },
    {
      title: "Anomaly Count",
      description: "Total number of anomalous patterns detected",
      icon: "🚨",
      category: "Anomaly Detection",
      formula: "Anomaly Count = Σ(Detected Anomalies across all methods)",
      importance: "Overall data quality health indicator"
    },
    {
      title: "Encoding Coverage Rate",
      description: "Percentage of categorical values successfully encoded",
      icon: "🎯",
      category: "Preprocessing",
      formula: "Coverage = (Successfully Encoded / Total Categorical Values) × 100",
      importance: "Measures preprocessing completeness"
    },
    {
      title: "Variance Threshold Check",
      description: "Percentage of features with variance above threshold",
      icon: "📈",
      category: "Feature Selection",
      formula: "Variance Check = (Features with Var > Threshold / Total Features) × 100",
      importance: "Identifies informative features"
    },
    {
      title: "Data Density Completeness",
      description: "Measure of how densely populated the dataset is",
      icon: "🧩",
      category: "Completeness",
      formula: "Density = (Non-null Values / Total Possible Values) × 100",
      importance: "Overall data availability metric"
    },
    {
      title: "Domain Constraint Violations",
      description: "Count of values violating business domain rules",
      icon: "🚫",
      category: "Business Rules",
      formula: "Violations = Σ(Values violating each domain constraint)",
      importance: "Ensures business logic compliance"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Comprehensive Metrics Guide
          </h1>
          <p className="text-base text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Discover how our platforms advanced preprocessing capabilities enhance your data quality 
            with comprehensive metrics, statistical formulas, and actionable insights for optimal data science workflows.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg p-1 shadow-md border border-gray-200">
            <button
              onClick={() => setActiveTab('core')}
              className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                activeTab === 'core'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🎯 Core Metrics
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                activeTab === 'detailed'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📋 Detailed Metrics
            </button>
          </div>
        </div>

        {/* Core Metrics Section */}
        {activeTab === 'core' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {coreMetrics.map((metric, index) => (
              <Card key={index} className="bg-white shadow-md hover:shadow-lg transition-all duration-300 border-0 rounded-xl overflow-hidden group">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-white shadow-sm group-hover:scale-105 transition-transform">
                        {metric.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900 mb-1">
                          {metric.title}
                        </CardTitle>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium text-xs">
                          {metric.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-gray-700 mt-2 text-sm leading-relaxed">
                    {metric.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                        <Settings className="h-3 w-3 mr-1 text-blue-600" />
                        Key Features
                      </h4>
                      <div className="grid grid-cols-2 gap-1">
                        {metric.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 justify-center py-1 text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center">
                        <BookOpen className="h-3 w-3 mr-1 text-purple-600" />
                        Formula
                      </h4>
                      <code className="text-xs text-gray-800 bg-white px-2 py-1 rounded block border">
                        {metric.formula}
                      </code>
                    </div>

                    <div className="flex items-center space-x-2 bg-green-50 p-2 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-800 font-semibold">
                        {metric.improvement}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detailed Metrics Section */}
        {activeTab === 'detailed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {detailedMetrics.map((metric, index) => (
              <Card key={index} className="bg-white shadow-sm hover:shadow-md transition-all duration-300 border-0 rounded-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{metric.icon}</span>
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900">
                        {metric.title}
                      </CardTitle>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs mt-1">
                        {metric.category}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-gray-600 text-xs leading-relaxed">
                    {metric.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-2 rounded-md">
                      <h4 className="text-xs font-semibold text-blue-900 mb-1 uppercase tracking-wide">
                        Formula
                      </h4>
                      <code className="text-xs text-blue-800 bg-white px-2 py-1 rounded block border">
                        {metric.formula}
                      </code>
                    </div>
                    
                    <div className="bg-amber-50 p-2 rounded-md">
                      <h4 className="text-xs font-semibold text-amber-900 mb-1 uppercase tracking-wide">
                        Importance
                      </h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {metric.importance}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-600">
            🚀 <strong>Powered by Advanced Analytics</strong> - Transform your data quality with intelligent preprocessing
          </p>
        </div>
      </div>
    </div>
  );
}