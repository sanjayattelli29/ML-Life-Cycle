"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Info, AlertCircle, CheckCircle2, ChevronRight, BarChart3, Calculator, Table as TableIcon } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";

export default function MetricsGuidePage() {
  const metrics = [
    {
      sNo: 1,
      title: "Missing Values",
      description: "Count of empty cells across the dataset.",
      formulas: [
        "Missing Count = Σ(null values)",
        "Total Cells = rows × columns",
        "Missing % = (Missing Count / Total Cells) × 100"
      ],
      codeSnippet: `missing_count = int(df.isnull().sum().sum())
missing_pct = (missing_count / (n_rows * n_cols) * 100)`,
      notes: ["Uses Pandas .isnull()", "Counts cell-level, not column-level"]
    },
    {
      sNo: 2,
      title: "Duplicate Records",
      description: "Number of rows that are identical to previous rows.",
      formulas: [
        "Duplicate Count = Rows identical to previous ones"
      ],
      codeSnippet: `duplicate_count = int(df.duplicated().sum())
duplicate_pct = (duplicate_count / n_rows * 100)`,
      notes: ["Uses Pandas .duplicated()", "Compares entire row values", "First occurrence not counted"]
    },
    {
      sNo: 3,
      title: "Outlier Count",
      description: "Rows considered anomalies in numeric space using Machine Learning.",
      formulas: [
        "ML Method: Isolation Forest",
        "Contamination: 0.05 (Assume 5% outliers)"
      ],
      codeSnippet: `numeric_data = df[numeric_cols].fillna(median)
iso = IsolationForest(contamination=0.05)
preds = iso.fit_predict(numeric_data)
outlier_count = (preds == -1).sum()`,
      notes: ["Uses only numeric columns", "Missing values filled with median", "-1 = Outlier, 1 = Normal"]
    },
    {
      sNo: 4,
      title: "Inconsistent Formats",
      description: "Columns containing mixed data types (e.g., numbers and strings).",
      formulas: [
        "Count = # columns with >1 python datatype"
      ],
      codeSnippet: `unique_types = set(type(x) for x in df[col].dropna())
if len(unique_types) > 1:
    incons_count += 1`,
      notes: ["Example: ['10', 20, 'Thirty'] -> str + int"]
    },
    {
      sNo: 5,
      title: "Cardinality / Uniqueness",
      description: "Average number of unique values in categorical columns.",
      formulas: [
        "Cardinality = Σ(unique values per cat column) / # cat columns"
      ],
      codeSnippet: `cardinality = int(
    np.mean([df[col].nunique() for col in categorical_cols])
)`,
      notes: ["Only object/category columns used", "Measures category diversity"]
    },
    {
      sNo: 6,
      title: "Data Type Mismatch",
      description: "Cells not matching the dominant datatype of their column.",
      formulas: [
        "Mismatch Count = Σ(value type ≠ dominant type)",
        "Total = Non-null cells"
      ],
      codeSnippet: `dominant_type = series.map(type).mode()[0]
mismatches = (series.map(type) != dominant_type).sum()`,
      notes: ["1. Determine most common type", "2. Count values deviations", "Example: [10, 20, '30'] -> '30' is mismatch"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight pb-2">
            Comprehensive Metrics Guide
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
            Deep dive into how your data quality is calculated. Transparency in every metric.
          </p>
        </div>

        {/* Quality Metrics Section */}
        <div className="space-y-8">
          <div className="flex items-center space-x-4 border-b pb-4 border-gray-200">
            <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
              <TableIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Quality Metrics Breakdown</h2>
              <p className="text-gray-500 text-sm">Detailed explanation of each quality check performed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {metrics.map((metric) => (
              <MetricCard key={metric.sNo} {...metric} />
            ))}
          </div>
        </div>

        {/* Statistical Summaries Section */}
        <div className="space-y-8">
          <div className="flex items-center space-x-4 border-b pb-4 border-gray-200">
            <div className="p-3 bg-green-100 rounded-xl shadow-sm">
              <Calculator className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Statistical Summaries</h2>
              <p className="text-gray-500 text-sm">Understanding the distribution of your numerical data</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-16 -mt-16 opacity-50"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <StatBlock
                title="Mean"
                formula="Σx / n"
                desc="The arithmetic average of the column values."
              />
              <StatBlock
                title="Median"
                formula="Middle value"
                desc="The middle value after sorting the data. Robust against outliers."
              />
              <StatBlock
                title="Std Dev"
                formula="√[Σ(x-μ)² / (n-1)]"
                desc="Standard Deviation. Measures how spread out the numbers are."
              />
            </div>

            <div className="mt-8 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-inner">
              <h4 className="font-semibold text-gray-100 mb-3 flex items-center text-sm uppercase tracking-wider">
                <BarChart3 className="h-4 w-4 mr-2 text-green-400" />
                Backend Implementation Logic
              </h4>
              <div className="relative group">
                <pre className="text-sm leading-relaxed text-blue-300 font-mono overflow-x-auto bg-black/30 p-4 rounded-lg">
                  <code>{`stats[col] = {
  'mean': series.mean(),
  'median': series.median(),
  'std': series.std()
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Info */}
        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-3xl font-bold flex items-center text-white">
                <AlertCircle className="h-8 w-8 mr-4 text-yellow-400" />
                Architectural Insight
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Your UI metrics do not come from a generic analyzer. They are calculated by the <code className="bg-white/10 px-2 py-1 rounded text-yellow-300 font-mono text-base mx-1 border border-white/10">DataQualityMetrics.calculate_metrics()</code> class in your backend, serving as the dedicated engine for this dashboard.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full lg:w-auto min-w-[320px] shadow-inner">
              <h4 className="font-semibold mb-6 text-yellow-400 text-sm uppercase tracking-wider border-b border-white/10 pb-2">Metric Engines Used</h4>
              <ul className="space-y-4 text-base text-gray-200">
                <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" /> Pandas null count</li>
                <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" /> Isolation Forest (ML)</li>
                <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" /> Python type comparison</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8 pb-12">
          <Link
            href="/dashboard/quality-metrics"
            className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-full transition-all shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1 active:translate-y-0"
          >
            Back to metrics
            <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ sNo, title, description, codeSnippet, formulas, notes }: any) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full bg-white group ring-1 ring-gray-100 hover:ring-blue-100 rounded-2xl">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-5 pt-6 relative px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-blue-200 shadow-md group-hover:scale-110 transition-transform duration-300">
              {sNo}
            </div>
            <CardTitle className="text-xl font-bold text-gray-800">{title}</CardTitle>
          </div>
        </div>
        <CardDescription className="mt-3 text-sm text-gray-600 leading-relaxed font-medium px-1">
          {description}
        </CardDescription>
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Info className="h-24 w-24 text-blue-600 -mt-4 -mr-4 transform rotate-12" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 px-6 pb-6 flex-1 space-y-6">

        {/* Formula Section */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
            <Calculator className="h-3 w-3 mr-1" /> Formula & Logic
          </h4>
          <div className="bg-blue-50 rounded-xl p-4 space-y-2 border border-blue-100">
            {formulas.map((f: string, i: number) => (
              <div key={i} className="text-sm font-medium text-blue-900 flex items-start">
                <span className="mr-2 text-blue-500">•</span> {f}
              </div>
            ))}
          </div>
        </div>

        {/* Code Snippet */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> Backend Code
          </h4>
          <div className="bg-[#1e1e1e] rounded-xl p-4 overflow-x-auto shadow-inner border border-gray-800 group-hover:border-gray-700 transition-colors">
            <pre className="text-xs leading-relaxed text-gray-300 font-mono">
              <code>{codeSnippet}</code>
            </pre>
          </div>
        </div>

        {/* Notes */}
        {notes.length > 0 && (
          <div className="pt-2">
            <div className="flex flex-wrap gap-2">
              {notes.map((note: string, i: number) => (
                <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 px-3 py-1">
                  {note}
                </Badge>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

function StatBlock({ title, formula, desc }: { title: string, formula: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{title}</h3>
        <span className="text-xs font-mono bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 text-blue-700 font-semibold">
          {formula}
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}