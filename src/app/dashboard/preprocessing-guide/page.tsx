"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Info, AlertCircle, CheckCircle2, ChevronRight, BarChart3, Calculator, Table as TableIcon } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";

export default function PreprocessingGuidePage() {
    const metrics = [
        {
            sNo: 1,
            title: "Missing Values Handling",
            description: "Detects missing data and automatically imputes or removes it based on thresholds.",
            formulas: [
                "Missing% > 50% → Drop Column",
                "Numeric Imputation: MICE (IterativeImputer)",
                "Categorical Imputation: Mode (Most Frequent)"
            ],
            codeSnippet: `missing_pct = df[col].isnull().mean()
if missing_pct > 0.5:
    df.drop(col, axis=1)
else:
    # MICE for numeric, Mode for categorical
    imputer = IterativeImputer(max_iter=10)
    df[col].fillna(df[col].mode()[0])`,
            notes: ["Threshold: 50%", "MICE Regression Imputation", "Mode for Categorical"]
        },
        {
            sNo: 2,
            title: "Duplicate Records",
            description: "Identifies and removes rows that are exact duplicates of others.",
            formulas: [
                "Duplicate = hash(row_i) == hash(row_j)",
                "Action: Keep First, Remove Others"
            ],
            codeSnippet: `row_hashes = df.apply(lambda r: 
    hashlib.md5(str(r.values).encode()).hexdigest(), axis=1)
duplicates = row_hashes.duplicated()
df = df[~duplicates]`,
            notes: ["MD5 Row Hashing", "Exact Match Removal", "Memory Efficient"]
        },
        {
            sNo: 3,
            title: "Outlier Treatment",
            description: "Detects anomalies using Isolation Forest and caps them with median values.",
            formulas: [
                "Method: Isolation Forest (contamination=0.1)",
                "Score -1 → Outlier, 1 → Normal",
                "Action: Replace with Median"
            ],
            codeSnippet: `iso = IsolationForest(contamination=0.1)
pred = iso.fit_predict(numeric_data)
outlier_mask = pred == -1
df.loc[outlier_mask, col] = df[col].median()`,
            notes: ["Isolation Forest ML", "Replaced with Median", "Robust to Skew"]
        },
        {
            sNo: 4,
            title: "Inconsistent Formats",
            description: "Standardizes text data by fixing common formatting issues.",
            formulas: [
                "Heuristics: Regex for Emails, Phones",
                "Normalization: Trim, Lowercase, Symbol Removal"
            ],
            codeSnippet: `if str.contains('@'): # Email
    val = val.lower().strip()
elif regex(phone_pattern): # Phone
    val = re.sub(r'[\+\-\(\)\s]', '', val)
else:
    val = val.strip().replace('  ', ' ')`,
            notes: ["Email Normalization", "Phone Cleanup", "Whitespace Trimming"]
        },
        {
            sNo: 5,
            title: "Cardinality / Uniqueness",
            description: "Handles high cardinality in categorical columns by grouping rare values.",
            formulas: [
                "Threshold: > 100 Unique Values",
                "Action: Keep Top 100, Group rest as 'Other'"
            ],
            codeSnippet: `if df[col].nunique() > 100:
    top_100 = df[col].value_counts().head(100).index
    df[col] = df[col].apply(lambda x: 
        x if x in top_100 else 'Other')`,
            notes: ["Threshold: 100", "Top-K Strategy", "Rare Grouping"]
        },
        {
            sNo: 6,
            title: "Data Type Mismatch",
            description: "Infers and corrects column data types based on content analysis.",
            formulas: [
                "Convertible Ratio > 80% → Change Type",
                "Checks: Numeric, Datetime"
            ],
            codeSnippet: `numeric_converted = pd.to_numeric(col, errors='coerce')
ratio = numeric_converted.notna().mean()
if ratio > 0.8:
    df[col] = numeric_converted
# Similar logic for Datetime`,
            notes: ["Soft Conversion", "80% Threshold", "Inference Logic"]
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto space-y-16">

                {/* Header Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight pb-2">
                        Preprocessing Logic Guide
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                        Understand how your data is cleaned, transformed, and optimized for Machine Learning.
                    </p>
                </div>

                {/* Quality Metrics Section */}
                <div className="space-y-8">
                    <div className="flex items-center space-x-4 border-b pb-4 border-gray-200">
                        <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
                            <TableIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Transformation Logic</h2>
                            <p className="text-gray-500 text-sm">Detailed explanation of preprocessing steps</p>
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
                            <h2 className="text-3xl font-bold text-gray-900">Statistical Operations</h2>
                            <p className="text-gray-500 text-sm">Key usage of statistics in cleaning</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-16 -mt-16 opacity-50"></div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                            <StatBlock
                                title="Mode Imputation"
                                formula="Most Frequent"
                                desc="Used for categorical missing values. Replaces nulls with the most common category."
                            />
                            <StatBlock
                                title="Median Capping"
                                formula="50th Percentile"
                                desc="Used for replacing outliers. More robust than Mean, ensuring extreme values don't skew data."
                            />
                            <StatBlock
                                title="Z-Score / IQR"
                                formula="Distribution"
                                desc="Used internally to validate distributions before applying transformations."
                            />
                        </div>

                        <div className="mt-8 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-inner">
                            <h4 className="font-semibold text-gray-100 mb-3 flex items-center text-sm uppercase tracking-wider">
                                <BarChart3 className="h-4 w-4 mr-2 text-green-400" />
                                Pipeline Execution Flow
                            </h4>
                            <div className="relative group">
                                <pre className="text-sm leading-relaxed text-blue-300 font-mono overflow-x-auto bg-black/30 p-4 rounded-lg">
                                    <code>{`def preprocess_all(self):
    self._handle_missing_values()      # Step 1
    self._handle_duplicates()          # Step 2
    self._handle_outliers()            # Step 3
    self._handle_cardinality()         # Step 4
    # ... returns clean_df`}</code>
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
                                Engine Insight
                            </h3>
                            <p className="text-gray-300 text-lg leading-relaxed">
                                These are not just visual metrics. They are active transformation steps executed by <code className="bg-white/10 px-2 py-1 rounded text-yellow-300 font-mono text-base mx-1 border border-white/10">AdvancedDataPreprocessor</code> class. Each card represents a pipeline stage that modifies your dataset in real-time.
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 w-full lg:w-auto min-w-[320px] shadow-inner">
                            <h4 className="font-semibold mb-6 text-yellow-400 text-sm uppercase tracking-wider border-b border-white/10 pb-2">Active Libraries</h4>
                            <ul className="space-y-4 text-base text-gray-200">
                                <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" /> Sklearn IterativeImputer (MICE)</li>
                                <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" /> Sklearn IsolationForest</li>
                                <li className="flex items-center"><CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" /> Pandas & NumPy Core</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8 pb-12">
                    <Link
                        href="/dashboard/pre-processing"
                        className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-full transition-all shadow-lg hover:shadow-blue-500/50 hover:-translate-y-1 active:translate-y-0"
                    >
                        Back to Preprocessing
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
