'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {  ArrowUpTrayIcon,
  ChartBarIcon,
  TableCellsIcon,
  ChartPieIcon,
  SparklesIcon,
  CpuChipIcon,
  ArrowRightIcon,
  PresentationChartBarIcon,
  Squares2X2Icon,
  CircleStackIcon,
  BeakerIcon,
  CheckCircleIcon,
  EyeIcon,
  BoltIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// ML Lifecycle Learning Flow Section Component
const MLLifecycleFlowSection = () => {
  const lifecycleSteps = [
    {
      id: 1,
      title: "Data Ingestion",
      description: "Upload and explore tabular datasets in a secure educational environment",
      icon: CircleStackIcon,
      color: "from-blue-500 to-cyan-600",
      bgColor: "from-blue-50 to-cyan-50"
    },
    {
      id: 2,
      title: "Data Quality Assessment",
      description: "Learn to evaluate data quality with 26+ automated metrics and comprehensive analysis",
      icon: BeakerIcon,
      color: "from-emerald-500 to-teal-600",
      bgColor: "from-emerald-50 to-teal-50"
    },
    {
      id: 3,
      title: "Data Preprocessing",
      description: "Master cleaning, transformation, and feature engineering techniques with guided workflows",
      icon: CpuChipIcon,
      color: "from-purple-500 to-indigo-600",
      bgColor: "from-purple-50 to-indigo-50"
    },
    {
      id: 4,
      title: "Model Selection",
      description: "Explore various ML algorithms and understand their appropriate use cases",
      icon: CheckCircleIcon,
      color: "from-orange-500 to-red-600",
      bgColor: "from-orange-50 to-red-50"
    },
    {
      id: 5,
      title: "Model Training & Testing",
      description: "Train models with automated hyperparameter tuning and performance evaluation",
      icon: SparklesIcon,
      color: "from-pink-500 to-rose-600",
      bgColor: "from-pink-50 to-rose-50"
    },
    {
      id: 6,
      title: "Results & Deployment",
      description: "Analyze model performance and learn deployment concepts in a hands-on environment",
      icon: ClockIcon,
      color: "from-slate-500 to-gray-600",
      bgColor: "from-slate-50 to-gray-50"
    }
  ];

  const learningFeatures = [
    { name: "Interactive Tutorials", icon: ChartBarIcon, color: "from-blue-500 to-blue-600" },
    { name: "Collaborative Notes", icon: ArrowRightIcon, color: "from-emerald-500 to-emerald-600" },
    { name: "Digital Whiteboard", icon: ChartPieIcon, color: "from-purple-500 to-purple-600" },
    { name: "Visual Analytics", icon: PresentationChartBarIcon, color: "from-orange-500 to-orange-600" },
    { name: "Project Templates", icon: Squares2X2Icon, color: "from-pink-500 to-pink-600" },
    { name: "Automated Workflows", icon: SparklesIcon, color: "from-cyan-500 to-cyan-600" },
    { name: "Performance Metrics", icon: BeakerIcon, color: "from-indigo-500 to-indigo-600" },
    { name: "Team Collaboration", icon: CircleStackIcon, color: "from-teal-500 to-teal-600" },
    { name: "Real-time Feedback", icon: EyeIcon, color: "from-rose-500 to-rose-600" }
  ];

  return (
    <div className="mb-12">
      {/* Setup Popup */}
      <SetupPopup />
      
      {/* ML Lifecycle Learning Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
        <h2 className="text-2xl font-bold text-slate-800">Complete ML Lifecycle Learning</h2>
        <BoltIcon className="w-6 h-6 text-purple-600" />
      </div>

      {/* Lifecycle Steps */}
      <div className="mb-12">
        <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl p-8">
          {/* Desktop Flow - Horizontal */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-6 gap-4 relative">
              {lifecycleSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  <div className={`bg-gradient-to-br ${step.bgColor} rounded-2xl p-6 border-2 border-slate-100 hover:border-slate-200 transition-all duration-300 hover:scale-105 group h-full`}>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${step.color} text-white mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-slate-800 mb-2">{step.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{step.id}</span>
                    </div>
                  </div>
                  
                  {/* Arrow connector */}
                  {index < lifecycleSteps.length - 1 && (
                    <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                      <div className="w-6 h-6 bg-white rounded-full border-2 border-indigo-300 flex items-center justify-center shadow-lg">
                        <ArrowRightIcon className="w-3 h-3 text-indigo-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet Flow - Vertical */}
          <div className="lg:hidden">
            <div className="space-y-6">
              {lifecycleSteps.map((step, index) => (
                <div key={step.id} className="relative">
                  <div className={`bg-gradient-to-br ${step.bgColor} rounded-2xl p-6 border-2 border-slate-100 hover:border-slate-200 transition-all duration-300 group`}>
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${step.color} text-white group-hover:scale-110 transition-transform duration-300`}>
                          <step.icon className="w-6 h-6" />
                        </div>
                        <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{step.id}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-800 mb-2">{step.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Vertical arrow connector */}
                  {index < lifecycleSteps.length - 1 && (
                    <div className="flex justify-center py-3">
                      <div className="w-6 h-6 bg-white rounded-full border-2 border-indigo-300 flex items-center justify-center shadow-lg transform rotate-90">
                        <ArrowRightIcon className="w-3 h-3 text-indigo-600" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Educational platform description */}
          <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-2">Educational ML Learning Platform</h4>
                <p className="text-slate-700 leading-relaxed">
                  Smart Data Analyzer is a <span className="font-bold text-indigo-700">cloud-based educational platform</span> designed to help 
                  students and early-stage practitioners understand the complete machine learning lifecycle. From raw data ingestion to model 
                  deployment, our platform provides <span className="font-bold text-purple-700">hands-on learning experiences</span> with 
                  interactive tools, collaborative features, and automated workflows in a no-code environment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Features */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-cyan-600 to-blue-600 rounded-full"></div>
          <h3 className="text-xl font-bold text-slate-800">Interactive Learning Tools</h3>
          <EyeIcon className="w-5 h-5 text-cyan-600" />
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {learningFeatures.map((feature, index) => (
              <div key={index} className="group">
                <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-300 hover:scale-105 hover:shadow-lg text-center cursor-pointer">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{feature.name}</h4>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-3 h-3 text-white" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Collaborative Learning Environment</h4>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">
              Built for <span className="font-bold text-cyan-700">academic teamwork</span> and project development, 
              our platform includes collaborative tools like integrated notes and digital whiteboard. 
              Students can work together on <span className="font-bold text-blue-700">real-world ML projects</span> 
              while learning essential data science workflows in a guided, interactive environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import SetupPopup from '@/components/SetupPopup';

export default function Dashboard() {
  const { data: session } = useSession();
  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch('/api/datasets');
        if (response.ok) {
          const data = await response.json();
          setDatasets(data);
        }
      } catch (error) {
        console.error('Error fetching datasets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <SetupPopup />
      {/* Header Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl">
            <CpuChipIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Smart Data Analyzer
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <SparklesIcon className="w-4 h-4 text-indigo-600" />
              <p className="text-sm font-medium text-slate-600">
                <span className="font-bold text-indigo-700">Educational ML Platform</span> for Complete Lifecycle Learning
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-6">
          <p className="text-xl text-slate-700 font-medium mb-3">
            Welcome to your <span className="text-indigo-700 font-bold">ML Learning Journey</span>, {session?.user?.name || 'Student'}! 
          </p>
          <p className="text-slate-600 leading-relaxed">
            The Smart Data Analyzer is a <span className="font-semibold text-emerald-700">cloud-based educational platform</span> designed to help students 
            and early-stage practitioners understand and practice the <span className="font-semibold text-purple-700">complete machine learning lifecycle</span> — 
            from raw data ingestion to model deployment.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-800">Start Your ML Journey</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link 
            href="/dashboard/upload"
            className="group relative block p-6 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 hover:border-indigo-300 transition-all duration-300 hover:bg-white/90"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white mb-3 group-hover:scale-105 transition-transform duration-300">
                <ArrowUpTrayIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Upload Dataset</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Begin with data ingestion and learn quality assessment fundamentals</p>
            </div>
          </Link>

          <Link 
            href="/dashboard/data-table"
            className="group relative block p-6 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:bg-white/90"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white mb-3 group-hover:scale-105 transition-transform duration-300">
                <TableCellsIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Explore Data</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Interactive exploration and learn data understanding techniques</p>
            </div>
          </Link>

          <Link 
            href="/dashboard/bar-charts"
            className="group relative block p-6 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 hover:border-orange-300 transition-all duration-300 hover:bg-white/90"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white mb-3 group-hover:scale-105 transition-transform duration-300">
                <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Visualize Patterns</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Create meaningful visualizations and discover data insights</p>
            </div>
          </Link>

          <Link 
            href="/dashboard/model-training"
            className="group relative block p-6 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-200 hover:border-purple-300 transition-all duration-300 hover:bg-white/90"
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white mb-3 group-hover:scale-105 transition-transform duration-300">
                <CpuChipIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Train Models</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Learn ML algorithms and practice model training workflows</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Datasets */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-800">Your Learning Projects</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
          </div>
        ) : datasets.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {datasets.slice(0, 5).map((dataset) => (
                <li key={dataset._id} className="hover:bg-slate-50/50 transition-colors duration-200">
                  <Link href={`/dashboard/data-table?id=${dataset._id}`} className="block">
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                          <p className="text-base font-bold text-slate-800 truncate">{dataset.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200">
                            {new Date(dataset.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <p className="text-sm font-medium text-slate-700">
                            {dataset.columns?.length || 0} features
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                          <p className="text-sm font-medium text-slate-700">
                            {dataset.data?.length || 0} samples
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200 rounded-xl p-8 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to Start Learning?</h3>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                Begin your machine learning journey by uploading your first dataset. Practice the complete ML lifecycle from data ingestion to model deployment.
              </p>
              <Link 
                href="/dashboard/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-300 hover:scale-105"
              >
                <ArrowUpTrayIcon className="w-4 h-4" aria-hidden="true" />
                Start Learning
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ML Lifecycle Section */}
      <MLLifecycleFlowSection />
    </div>
  );
}