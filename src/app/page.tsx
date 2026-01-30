"use client";

import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Zap, Shield, TrendingUp, Users, Database, BarChart3, Brain, CheckCircle, ArrowRight, ArrowDown, Menu, X, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleAIChatbot from '@/components/SimpleAIChatbot';

const EnhancedLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pricingSlider, setPricingSlider] = useState(1);
  const [showVideo, setShowVideo] = useState(false);

  // Auto-playing testimonials removed or simplified if desired, but keeping state for potential manual use or simple fade
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    { name: 'Emma Chen', role: 'Computer Science Student', quote: "The hands-on approach helped me understand ML concepts that seemed impossible before. I built my first model in just 2 weeks!", avatar: 'EC', rating: 5 },
    { name: 'James Rodriguez', role: 'Data Science Professor', quote: "Perfect platform for teaching ML lifecycle. My students are more engaged and learn 70% faster with interactive modules.", avatar: 'JR', rating: 5 },
    { name: 'Sofia Patel', role: 'PhD Researcher', quote: "Collaborative features made working on group projects seamless. The whiteboard tool is fantastic for brainstorming.", avatar: 'SP', rating: 5 },
  ];

  const features = [
    { icon: Brain, title: 'Interactive Learning', desc: 'Hands-on ML tutorials & exercises' },
    { icon: Zap, title: 'Real-time Collaboration', desc: 'Work together on ML projects' },
    { icon: BarChart3, title: 'Visualization Tools', desc: 'Interactive charts & dashboards' },
    { icon: Shield, title: 'Secure Learning Environment', desc: 'Safe & compliant platform' },
    { icon: TrendingUp, title: 'Progress Tracking', desc: 'Monitor learning milestones' },
    { icon: Database, title: 'Dataset Management', desc: 'Upload & manage learning data' },
    { icon: Users, title: 'Team Projects', desc: 'Collaborative group assignments' },
    { icon: Sparkles, title: 'Smart Guidance', desc: 'AI-powered learning assistance' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000); // Slower, more relaxing rotation
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const calculatePrice = (mb: number) => {
    const basePrice = 49;
    let discount = 0;
    if (mb >= 25) discount = 0.05;
    if (mb >= 50) discount = 0.10;
    if (mb >= 75) discount = 0.15;
    return Math.round(basePrice * mb * (1 - discount));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Smart Data Analyzer
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">Reviews</a>
              <Link href="/auth/signup">
                <button className="bg-black text-white px-6 py-2.5 rounded-full font-semibold hover:bg-gray-800 transition-all text-sm shadow-md hover:shadow-lg">
                  Start Free Trial
                </button>
              </Link>
            </nav>
            <button
              className="md:hidden text-gray-900"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 md:hidden pt-24 px-6">
          <div className="flex flex-col space-y-6">
            <a href="#features" className="text-2xl font-semibold text-gray-900 border-b border-gray-100 pb-4">Features</a>
            <a href="#pricing" className="text-2xl font-semibold text-gray-900 border-b border-gray-100 pb-4">Pricing</a>
            <a href="#testimonials" className="text-2xl font-semibold text-gray-900 border-b border-gray-100 pb-4">Reviews</a>
            <Link href="/auth/signup">
              <button className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200">
                Start Free Trial
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 sm:px-8 lg:px-12 bg-white relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-3xl -z-10 opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-3xl -z-10 opacity-60"></div>

        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-100 mb-8 bg-blue-50/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs font-bold tracking-widest uppercase text-blue-600">Educational ML Platform</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
            Master the Complete <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">ML Lifecycle Journey</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            From data ingestion to model deployment - master every step with hands-on learning and interactive tutorials in a premium environment.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-20">
            <Link href="/auth/signup">
              <button className="bg-blue-600 text-white px-10 py-4 rounded-full font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-3 text-lg">
                Start Learning Journey
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button
              onClick={() => {
                const section = document.getElementById('ml-server-section');
                section?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white text-gray-900 border border-gray-200 px-10 py-4 rounded-full font-bold hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-3 text-lg"
            >
              Get Started with ML Server
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-500 font-medium border-t border-gray-100 pt-10 max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>Free for students</span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>Interactive learning</span>
            </div>
            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>Collaborative platform</span>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Line */}
      <div className="max-w-7xl mx-auto px-4"><div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div></div>

      {/* Download ML Server Section */}
      <section id="ml-server-section" className="py-24 px-4 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 lg:p-16 border border-gray-100 shadow-lg shadow-gray-100/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-xs font-bold uppercase mb-6">
                  <Download className="w-3 h-3" />
                  <span>Desktop App</span>
                </div>
                <h3 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">Get Started with ML Server</h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  Download our ML Server application to start your machine learning journey. Run models locally and experience seamless data processing with our optimized powerhouse.
                </p>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-gray-800 font-medium">Easy one-click installation</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-gray-800 font-medium">Local model processing</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-gray-800 font-medium">Secure data handling</span>
                    </div>
                  </div>
                </div>
<a
  href="https://github.com/sanjayattelli29/ML-Life-Cycle/raw/master/python-codes-b.zip"
  download="python-codes-b.zip"
  className="inline-flex items-center justify-center gap-3 bg-gray-900 text-white px-8 py-5 rounded-xl font-bold hover:bg-black transition-all w-full md:w-auto hover:shadow-lg text-lg"
  onClick={(e) => {
    e.preventDefault();
    const button = e.currentTarget;
    const originalContent = button.innerHTML;

    button.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
          </path>
        </svg>
        Downloading...
      </div>
    `;

    window.location.href =
      "https://github.com/sanjayattelli29/ML-Life-Cycle/raw/master/python-codes-b.zip";

    setTimeout(() => {
      button.innerHTML = originalContent;
    }, 3000);
  }}
>
  <Download className="w-5 h-5" />
  Download Python Codes (.zip)
</a>

                <p className="mt-4 text-sm text-gray-400 font-medium">Version 1.0.0 | Windows 10/11 64-bit</p>
              </div>

              <div className="relative">
                <div
                  className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10 cursor-pointer group border-4 border-white"
                  onClick={() => setShowVideo(true)}
                >
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors z-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-20 h-20 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300 pl-1">
                      <Play className="w-8 h-8 text-blue-600 fill-blue-600" />
                    </div>
                  </div>
                  <Image
                    src="/banner.png"
                    alt="Learning Demo Preview"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                {/* Decorative blob behind video */}
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-[2rem] -z-10 opacity-50 blur-xl"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Modal */}
        {showVideo && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5">
              <button
                onClick={() => setShowVideo(false)}
                className="absolute top-6 right-6 z-10 text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/50 rounded-full p-2 backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="aspect-video">
                <video
                  src="https://res.cloudinary.com/dws3beqwu/video/upload/v1750513405/wli81fl1tsjg8ui0qovp.mp4"
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="py-24 px-4 sm:px-8 lg:px-12 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Why Choose Our Platform?</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full mb-6"></div>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Discover the features that make our platform the perfect environment for mastering machine learning.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Hands-On Learning', desc: 'Practice with real datasets and interactive tutorials designed for deep understanding.' },
              { title: 'Complete ML Lifecycle', desc: 'Learn every step from data ingestion to model deployment in structured modules.' },
              { title: 'Collaborative Environment', desc: 'Work with classmates and instructors in real-time collaborative workspace.' },
              { title: 'Educational Focus', desc: 'Curriculum designed by ML experts specifically for academic learning outcomes.' }
            ].map((item, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mb-6 rounded-full group-hover:w-20 transition-all duration-300"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decorative Line */}
      <div className="max-w-7xl mx-auto px-4"><div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent my-12"></div></div>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-3 block">Features</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Comprehensive Toolset</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Everything you need to master machine learning in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col p-8 bg-gray-50/50 rounded-2xl hover:bg-white border border-transparent hover:border-gray-200 transition-colors">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                  <feature.icon className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Steps */}
      <section className="py-24 px-4 sm:px-8 lg:px-12 bg-gray-900 text-white relative overflow-hidden rounded-t-[3rem] mt-12">
        {/* Background gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">The Learning Path</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Master each stage of the machine learning lifecycle with our comprehensive curriculum.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Data Ingestion', desc: 'Upload and explore tabular datasets in a secure educational environment.' },
              { step: '02', title: 'Data Quality', desc: 'Learn to evaluate data quality with 26+ automated metrics and indicators.' },
              { step: '03', title: 'Preprocessing', desc: 'Master cleaning, transformation, and feature engineering techniques.' },
              { step: '04', title: 'Model Selection', desc: 'Explore various ML algorithms and understand their optimal use cases.' },
              { step: '05', title: 'Training & Testing', desc: 'Train models with automated hyperparameter tuning and validation.' },
              { step: '06', title: 'Deployment', desc: 'Analyze model performance and learn real-world deployment concepts.' }
            ].map((item, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 relative overflow-hidden group hover:bg-gray-800 transition-colors">
                <span className="text-8xl font-black text-gray-800 absolute -top-6 -right-6 select-none opacity-50 group-hover:text-gray-700 transition-colors">{item.step}</span>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-4 sm:px-8 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">Simple Pricing</h2>
            <p className="text-gray-600 max-w-xl mx-auto text-xl">
              Transparent pay-as-you-go pricing for students and institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {/* Plan Card */}
            <div className="bg-gray-50 rounded-3xl p-10 lg:p-12 border border-gray-200 flex flex-col relative overflow-hidden">
              <div className="mb-10 relative z-10">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Student Plan</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-gray-900 tracking-tighter">₹49</span>
                  <span className="text-gray-500 font-medium">/ MB processed</span>
                </div>
              </div>
              <ul className="space-y-6 mb-12 flex-1 relative z-10">
                {[
                  'Interactive ML tutorials',
                  'Collaborative workspaces',
                  'Dataset upload & management',
                  'Visualization tools',
                  'Educational support',
                  'Secure learning environment'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-4 text-gray-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="relative z-10">
                <button className="w-full bg-white border-2 border-gray-200 text-gray-900 py-4 rounded-xl font-bold hover:border-gray-900 transition-colors">
                  Start Learning Free
                </button>
              </Link>
            </div>

            {/* Calculator Card with Gradient */}
            <div className="bg-black text-white rounded-3xl p-10 lg:p-12 shadow-2xl shadow-gray-200 flex flex-col relative overflow-hidden">
              {/* Decorative Gradient Blob */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/30 rounded-full blur-[80px] -z-0"></div>

              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-8">Cost Calculator</h3>

                <div className="mb-10">
                  <div className="flex justify-between mb-6">
                    <label className="font-medium text-gray-300">Dataset Size</label>
                    <span className="font-bold text-blue-400 text-xl">{pricingSlider} MB</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={pricingSlider}
                    onChange={(e) => setPricingSlider(Number(e.target.value))}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-4 font-medium uppercase tracking-wider">
                    <span>1 MB</span>
                    <span>100 MB</span>
                  </div>
                </div>

                <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-800 mb-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 font-medium">Estimated Cost</span>
                    <span className="text-4xl font-bold text-white">₹{calculatePrice(pricingSlider)}</span>
                  </div>
                  {pricingSlider >= 25 && (
                    <div className="text-right text-sm text-green-400 font-medium mt-2">
                      Includes volume discount applied
                    </div>
                  )}
                </div>

                <Link href="/auth/signup">
                  <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 pt-20 pb-10 px-4 sm:px-8 lg:px-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">Smart Data</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                Empowering students and educators to master machine learning through interactive education.
              </p>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'API', 'Integrations'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Documentation', 'Community', 'Status'] }
            ].map((column, i) => (
              <div key={i} className="flex flex-col">
                <h3 className="font-bold text-gray-900 mb-6">{column.title}</h3>
                <ul className="space-y-4 text-sm text-gray-500">
                  {column.links.map((link, j) => (
                    <li key={j}><a href="#" className="hover:text-blue-600 transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>&copy; 2025 Smart Data Analyzer. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <SimpleAIChatbot />
    </div>
  );
};

export default EnhancedLanding;