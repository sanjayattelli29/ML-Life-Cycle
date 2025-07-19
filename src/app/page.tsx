"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, Play, Sparkles, Zap, Shield, TrendingUp, Users, Database, BarChart3, Brain, CheckCircle, Star, ArrowRight, Menu, X } from 'lucide-react';
import Link from 'next/link';

const EnhancedLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [pricingSlider, setPricingSlider] = useState(1);

  const testimonials = [
    { name: 'Emma Chen', role: 'Data Scientist at TechCorp', quote: "DataViz-AI transformed our entire analytics workflow. We're now 300% faster at generating insights.", avatar: 'EC', rating: 5 },
    { name: 'James Rodriguez', role: 'Analytics Manager', quote: "The AI preprocessing saves us 15+ hours weekly. It's like having a team of data engineers at your fingertips.", avatar: 'JR', rating: 5 },
    { name: 'Sofia Patel', role: 'Data Engineer', quote: "Managing petabyte-scale datasets has never been this seamless. The quality assessment is phenomenal.", avatar: 'SP', rating: 5 },
    { name: 'Lucas Thompson', role: 'BI Director', quote: "Our executive dashboards now update in real-time with predictive insights. Game-changing for decision making.", avatar: 'LT', rating: 5 },
    { name: 'Isabella Wong', role: 'Research Lead', quote: "The deep learning models caught patterns we missed for months. ROI was immediate and substantial.", avatar: 'IW', rating: 5 },
    { name: 'Oliver Singh', role: 'ML Engineer', quote: "Model accuracy improved by 40% using their automated feature engineering. Simply outstanding.", avatar: 'OS', rating: 5 }
  ];

  const features = [
    { icon: Brain, title: '15+ AI Models', desc: 'Deep learning & neural networks' },
    { icon: Zap, title: 'Lightning Speed', desc: 'Process TB data in seconds' },
    { icon: BarChart3, title: '25+ Visualizations', desc: 'Interactive & 3D charts' },
    { icon: Shield, title: 'Enterprise Security', desc: 'SOC2 & GDPR compliant' },
    { icon: TrendingUp, title: 'Predictive Analytics', desc: 'Future trend forecasting' },
    { icon: Database, title: 'Any Data Format', desc: 'CSV, JSON, SQL, APIs' },
    { icon: Users, title: 'Team Collaboration', desc: 'Real-time sharing & editing' },
    { icon: Sparkles, title: 'Auto Insights', desc: 'AI-generated recommendations' }
  ];

  const steps = [
    { step: '01', title: 'Upload & Connect', desc: 'Drag & drop files or connect to 50+ data sources instantly' },
    { step: '02', title: 'AI Processing', desc: 'Advanced ML algorithms clean, analyze, and discover hidden patterns' },
    { step: '03', title: 'Generate Insights', desc: 'Get interactive dashboards with predictive analytics and recommendations' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculatePrice = (mb) => {
    const basePrice = 49;
    let discount = 0;
    if (mb >= 25) discount = 0.05;
    if (mb >= 50) discount = 0.10;
    if (mb >= 75) discount = 0.15;
    return Math.round(basePrice * mb * (1 - discount));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/40 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-700 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
                DataViz-AI
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 font-medium hover:text-blue-700 transition-colors text-base">Features</a>
              <a href="#pricing" className="text-gray-700 font-medium hover:text-blue-700 transition-colors text-base">Pricing</a>
              <a href="#testimonials" className="text-gray-700 font-medium hover:text-blue-700 transition-colors text-base">Reviews</a>
              <Link href="/auth/signup"><button className="bg-gradient-to-r from-blue-700 to-purple-700 text-white px-5 py-2 rounded-full font-semibold shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base">
                Start Free Trial
              </button></Link>
            </nav>
            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white/95 z-40 md:hidden backdrop-blur-xl">
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <a href="#features" className="text-2xl text-gray-700 font-semibold">Features</a>
            <a href="#pricing" className="text-2xl text-gray-700 font-semibold">Pricing</a>
            <a href="#testimonials" className="text-2xl text-gray-700 font-semibold">Reviews</a>
            <Link href="/auth/signup"><button className="bg-gradient-to-r from-blue-700 to-purple-700 text-white px-8 py-3 rounded-full text-xl font-bold shadow-lg">
              Start Free Trial
            </button></Link>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-2xl scale-125 -z-10" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-200 to-purple-200 text-blue-800 px-6 py-2 rounded-full mb-6 border border-blue-200/60 shadow-md">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold text-xs tracking-widest uppercase">SMART DATA ANALYZER</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight drop-shadow-xl">
              Transform Data Into
              <span className="block bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-700 bg-clip-text text-transparent">
                Actionable Intelligence
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-3 max-w-2xl mx-auto font-medium">
              Powered by <span className="font-bold text-blue-700">AI Agents & Deep Learning</span>
            </p>
            <p className="text-base text-gray-500 mb-8 max-w-xl mx-auto">
              Analyze petabyte-scale datasets, generate predictive insights, and create stunning visualizations in seconds. 
              Experience the future of data intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
              <Link href="/auth/signup"><button className="group bg-gradient-to-r from-blue-700 to-purple-700 text-white px-7 py-3 rounded-full text-lg font-bold shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                Experience the Future
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button></Link>
              <button className="group flex items-center gap-3 text-gray-700 hover:text-blue-700 transition-colors text-base font-semibold">
                <div className="w-10 h-10 bg-white/80 rounded-full shadow-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <Play className="w-5 h-5 ml-1" />
                </div>
                <span>Watch Demo (2 min)</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-6 text-base text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
          <div className="relative max-w-5xl mx-auto">
            <div className="relative bg-white/80 rounded-3xl shadow-2xl border border-gray-200/60 overflow-hidden backdrop-blur-xl min-h-[120px] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
              <div className="absolute top-4 left-4 flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              {/* Tagline in the center */}
              <div className="relative z-10 w-full flex justify-center">
                <span className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight text-center select-none">
                  AI-Powered Data Intelligence, Instantly.
                </span>
              </div>
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-white/90 rounded-xl shadow-xl p-3 border border-gray-200/60">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>+347% Accuracy</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white/90 rounded-xl shadow-xl p-3 border border-gray-200/60">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>Processing 500TB/day</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why DataViz-AI? */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-white/80 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Why DataViz-AI?</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Discover the unique advantages that set us apart in the world of data intelligence.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow border border-blue-100/60">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Unmatched Speed</h3>
            <p className="text-gray-700 text-sm">Process massive datasets in seconds with our optimized AI pipelines.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow border border-purple-100/60">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">Enterprise Security</h3>
            <p className="text-gray-700 text-sm">SOC2, GDPR, and advanced encryption keep your data safe and compliant.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-6 shadow border border-blue-100/60">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">AI-Driven Insights</h3>
            <p className="text-gray-700 text-sm">Get actionable recommendations and predictive analytics instantly.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 shadow border border-purple-100/60">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">Collaboration</h3>
            <p className="text-gray-700 text-sm">Work with your team in real-time, anywhere in the world.</p>
          </div>
        </div>
      </section>

      {/* AI Capabilities */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">AI Capabilities</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Explore the advanced AI techniques powering DataViz-AI.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-blue-700 mb-1">Deep Learning</h3>
            <p className="text-gray-700 text-sm">Neural networks for complex pattern recognition and forecasting.</p>
          </div>
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-purple-700 mb-1">Natural Language Processing</h3>
            <p className="text-gray-700 text-sm">Extract insights from unstructured text and documents.</p>
          </div>
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-blue-700 mb-1">Automated Feature Engineering</h3>
            <p className="text-gray-700 text-sm">Boost model accuracy with AI-driven feature selection.</p>
          </div>
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-purple-700 mb-1">Anomaly Detection</h3>
            <p className="text-gray-700 text-sm">Spot outliers and data quality issues automatically.</p>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-white/80 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Integrations</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Connect to your favorite data sources and formats.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">CSV</span>
          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-xs font-semibold border border-purple-200/60 shadow">JSON</span>
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">SQL</span>
          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-xs font-semibold border border-purple-200/60 shadow">Excel</span>
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">APIs</span>
          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-xs font-semibold border border-purple-200/60 shadow">BigQuery</span>
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">Snowflake</span>
        </div>
      </section>

      {/* Customer Success */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Customer Success</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">See how our customers are winning with DataViz-AI.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60 text-left">
            <h3 className="text-base font-semibold text-blue-700 mb-1">TechCorp</h3>
            <p className="text-gray-700 text-sm mb-2">&quot;Reduced analytics time by 80% and improved decision-making across teams.&quot;</p>
            <span className="text-xs text-gray-500">Emma Chen, Data Scientist</span>
          </div>
          <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60 text-left">
            <h3 className="text-base font-semibold text-purple-700 mb-1">FinSight</h3>
            <p className="text-gray-700 text-sm mb-2">&quot;Automated data quality checks saved us 15+ hours weekly.&quot;</p>
            <span className="text-xs text-gray-500">James Rodriguez, Analytics Manager</span>
          </div>
          <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60 text-left">
            <h3 className="text-base font-semibold text-blue-700 mb-1">HealthAI</h3>
            <p className="text-gray-700 text-sm mb-2">&quot;Discovered hidden trends in patient data, improving outcomes.&quot;</p>
            <span className="text-xs text-gray-500">Sofia Patel, Data Engineer</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-white/80 border-b border-gray-200/40">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Everything you need to know about DataViz-AI.</p>
        </div>
        <div className="max-w-3xl mx-auto">
          {/* Simple collapsible FAQ (no animation) */}
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-blue-700 cursor-pointer">Is my data secure with DataViz-AI?</summary>
            <p className="text-gray-700 text-sm mt-2">Absolutely. We use enterprise-grade encryption and comply with SOC2 and GDPR standards.</p>
          </details>
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-purple-700 cursor-pointer">Can I try DataViz-AI for free?</summary>
            <p className="text-gray-700 text-sm mt-2">Yes, we offer a 14-day free trial with no credit card required.</p>
          </details>
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-blue-700 cursor-pointer">What data formats are supported?</summary>
            <p className="text-gray-700 text-sm mt-2">We support CSV, JSON, SQL, Excel, APIs, BigQuery, Snowflake, and more.</p>
          </details>
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-purple-700 cursor-pointer">How does AI preprocessing work?</summary>
            <p className="text-gray-700 text-sm mt-2">Our AI automatically cleans, analyzes, and enhances your data for better insights.</p>
          </details>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 sm:px-8 lg:px-12 bg-white/70 backdrop-blur-xl border-t border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-200 to-blue-200 text-purple-800 px-8 py-3 rounded-full mb-8 shadow-md">
              <Brain className="w-5 h-5" />
              <span className="font-bold text-base tracking-widest uppercase">POWERED BY AI</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight drop-shadow-lg">
              Revolutionary AI-Powered Platform
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-medium">
              Harness the power of advanced machine learning, neural networks, and deep learning algorithms 
              to unlock insights hidden in your data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {features.map((feature, index) => (
              <div key={index} className="group bg-white/90 rounded-2xl p-8 shadow-xl border border-gray-200/60 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 backdrop-blur-xl">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-gray-600 text-lg font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How It Works */}
      <section className="py-24 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-200 to-blue-200 text-green-800 px-8 py-3 rounded-full mb-8 shadow-md">
              <Zap className="w-5 h-5" />
              <span className="font-bold text-base tracking-widest uppercase">HOW IT WORKS</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight drop-shadow-lg">
              Three Steps to Data Mastery
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-medium">
              Our streamlined process transforms raw data into actionable insights in minutes, not hours.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white/90 rounded-2xl p-10 shadow-xl border border-gray-200/60 hover:shadow-2xl transition-all duration-300 backdrop-blur-xl">
                  <div className="text-7xl font-extrabold text-blue-700/20 mb-6">{step.step}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">{step.title}</h3>
                  <p className="text-gray-600 text-lg font-medium">{step.desc}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <ChevronRight className="w-10 h-10 text-blue-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-100 to-purple-100 border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-200 to-orange-200 text-yellow-800 px-8 py-3 rounded-full mb-8 shadow-md">
              <Star className="w-5 h-5" />
              <span className="font-bold text-base tracking-widest uppercase">TESTIMONIALS</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight drop-shadow-lg">
              Loved by 50,000+ Professionals
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-medium">
              See how industry leaders are transforming their businesses with DataViz-AI
            </p>
          </div>
          <div className="relative">
            <div className="bg-white/90 rounded-3xl p-12 shadow-2xl border border-gray-200/60 max-w-4xl mx-auto backdrop-blur-xl">
              <div className="flex items-center gap-1 mb-8">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-3xl text-gray-700 font-semibold mb-8 italic leading-relaxed">
                &ldquo;{testimonials[currentTestimonial].quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-700 to-purple-700 rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
                  {testimonials[currentTestimonial].avatar}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">{testimonials[currentTestimonial].name}</div>
                  <div className="text-gray-600 text-base">{testimonials[currentTestimonial].role}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-10 gap-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    index === currentTestimonial ? 'bg-blue-700 border-blue-700' : 'bg-gray-300 border-gray-300'
                  }`}
                  onClick={() => setCurrentTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-8 lg:px-12 bg-white/90 backdrop-blur-xl border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-200 to-blue-200 text-green-800 px-8 py-3 rounded-full mb-8 shadow-md">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold text-base tracking-widest uppercase">PRICING</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight drop-shadow-lg">
              Transparent Pay-as-You-Go Pricing
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-medium">
              Scale seamlessly from startup to enterprise with volume discounts and no hidden fees
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-12 border border-blue-200/60 shadow-xl">
              <div className="text-center mb-10">
                <h3 className="text-3xl font-extrabold text-gray-900 mb-3">Starter Plan</h3>
                <div className="text-6xl font-extrabold text-blue-700 mb-3">₹49</div>
                <div className="text-gray-700 text-lg font-medium">per MB processed</div>
              </div>
              <ul className="space-y-5 mb-10">
                {[
                  'Lightning-fast processing',
                  'All visualization types',
                  'AI-powered insights',
                  'Real-time collaboration',
                  '24/7 premium support',
                  'Enterprise-grade security'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-800 text-lg font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup"><button className="w-full bg-gradient-to-r from-blue-700 to-purple-700 text-white py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Start Free Trial &rarr;
              </button></Link>
            </div>
            <div className="bg-white/95 rounded-3xl p-12 border border-gray-200/60 shadow-xl backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Calculate Your Savings</h3>
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Dataset Size: <span className="text-blue-700 font-bold">{pricingSlider} MB</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={pricingSlider}
                  onChange={(e) => setPricingSlider(Number(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
                />
                <div className="flex justify-between text-base text-gray-500 mt-3 font-medium">
                  <span>1 MB</span>
                  <span>25 MB</span>
                  <span>50 MB</span>
                  <span>75 MB</span>
                  <span>100 MB</span>
                </div>
              </div>
              <div className="space-y-5 mb-8">
                <div className="flex justify-between items-center p-5 bg-gray-50 rounded-xl shadow border border-gray-200/60">
                  <span className="font-semibold text-lg">Total Cost</span>
                  <span className="text-3xl font-extrabold text-blue-700">₹{calculatePrice(pricingSlider)}</span>
                </div>
                <div className="text-base text-gray-700 space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span>Base rate (₹49/MB)</span>
                    <span>₹{49 * pricingSlider}</span>
                  </div>
                  {pricingSlider >= 25 && (
                    <div className="flex justify-between text-green-700 font-bold">
                      <span>Volume discount</span>
                      <span>-₹{49 * pricingSlider - calculatePrice(pricingSlider)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 text-base text-gray-500 mb-5">
                  <Shield className="w-5 h-5" />
                  <span>Secure payments powered by Razorpay</span>
                </div>
                <Link href="/auth/signup"><button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg">
                  Get Started Now
                </button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats */}
      <section className="py-24 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-gray-900 to-blue-900 text-white border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-14 text-center">
            {[
              { number: '50,000+', label: 'Datasets Analyzed', icon: Database },
              { number: '500 TB', label: 'Data Processed Daily', icon: Zap },
              { number: '99.9%', label: 'Analysis Accuracy', icon: TrendingUp },
              { number: '24/7', label: 'Expert Support', icon: Users }
            ].map((stat, index) => (
              <div key={index} className="group">
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-white/20 transition-colors shadow-lg">
                  <stat.icon className="w-10 h-10" />
                </div>
                <div className="text-5xl font-extrabold mb-3 tracking-tight drop-shadow-lg">{stat.number}</div>
                <div className="text-blue-200 text-lg font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-24 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-700 to-purple-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl sm:text-6xl font-extrabold mb-8 tracking-tight drop-shadow-xl">
            Ready to Transform Your Data?
          </h2>
          <p className="text-2xl mb-10 opacity-90 font-medium">
            Join thousands of professionals who trust DataViz-AI to power their data-driven decisions
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/auth/signup"><button className="bg-white text-blue-700 px-10 py-5 rounded-full font-bold text-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              Start Your Free Trial
            </button></Link>
            <button className="border-2 border-white text-white px-10 py-5 rounded-full font-bold text-2xl hover:bg-white hover:text-blue-700 transition-all duration-300 shadow-lg">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 px-4 sm:px-8 lg:px-12 border-t border-gray-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl flex items-center justify-center shadow-md">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-extrabold">DataViz-AI</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">
                Transforming data into intelligence with the power of AI and machine learning.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg">Product</h3>
              <ul className="space-y-3 text-gray-400 text-base font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg">Company</h3>
              <ul className="space-y-3 text-gray-400 text-base font-medium">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-6 text-lg">Support</h3>
              <ul className="space-y-3 text-gray-400 text-base font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-16 pt-10 text-center text-gray-400 text-lg font-medium">
            <p>&copy; 2025 DataViz-AI. All rights reserved. Built with ❤️ for data professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EnhancedLanding;