"use client";

import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Zap, Shield, TrendingUp, Users, Database, BarChart3, Brain, CheckCircle, Star, ArrowRight, ArrowDown, Menu, X, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import SimpleAIChatbot from '@/components/SimpleAIChatbot';

const EnhancedLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [pricingSlider, setPricingSlider] = useState(1);
  const [showVideo, setShowVideo] = useState(false);

  const testimonials = [
    { name: 'Emma Chen', role: 'Computer Science Student', quote: "The hands-on approach helped me understand ML concepts that seemed impossible before. I built my first model in just 2 weeks!", avatar: 'EC', rating: 5 },
    { name: 'James Rodriguez', role: 'Data Science Professor', quote: "Perfect platform for teaching ML lifecycle. My students are more engaged and learn 70% faster with interactive modules.", avatar: 'JR', rating: 5 },
    { name: 'Sofia Patel', role: 'PhD Researcher', quote: "Collaborative features made working on group projects seamless. The whiteboard tool is fantastic for brainstorming.", avatar: 'SP', rating: 5 },
    { name: 'Lucas Thompson', role: 'ML Engineering Student', quote: "From data preprocessing to model deployment - learned everything step by step. Now I feel confident about ML projects.", avatar: 'LT', rating: 5 },
    { name: 'Isabella Wong', role: 'Academic Coordinator', quote: "Excellent curriculum design and progress tracking. Students love the interactive learning environment.", avatar: 'IW', rating: 5 },
    { name: 'Oliver Singh', role: 'Data Science Graduate', quote: "The platform prepared me perfectly for my industry job. Real-world projects made all the difference.", avatar: 'OS', rating: 5 }
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
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

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
                Smart Data Analyzer
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
              <span className="font-bold text-xs tracking-widest uppercase">EDUCATIONAL ML PLATFORM</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight drop-shadow-xl">
              Master the Complete
              <span className="block bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-700 bg-clip-text text-transparent">
                ML Lifecycle Journey
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 mb-3 max-w-2xl mx-auto font-medium">
              Learn <span className="font-bold text-blue-700">Machine Learning End-to-End</span>
            </p>
            <p className="text-base text-gray-500 mb-8 max-w-xl mx-auto">
              From data ingestion to model deployment - master every step of the ML lifecycle with hands-on learning, 
              interactive tutorials, and collaborative projects designed for students and educators.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
              <Link href="/auth/signup"><button className="group bg-gradient-to-r from-blue-700 to-purple-700 text-white px-7 py-3 rounded-full text-lg font-bold shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                Start Learning Journey
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button></Link>
              <button 
                onClick={() => {
                  const section = document.getElementById('ml-server-section');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group bg-gradient-to-r from-purple-700 to-blue-700 text-white px-7 py-3 rounded-full text-lg font-bold shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
              >
                Get Started with ML Server
                <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
              </button>
              <button 
                onClick={() => setShowVideo(true)}
                className="group flex items-center gap-3 text-gray-700 hover:text-blue-700 transition-colors text-base font-semibold"
              >
                <div className="w-10 h-10 bg-white/80 rounded-full shadow-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <Play className="w-5 h-5 ml-1" />
                </div>
                <span>Watch Learning Demo (2 min)</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-6 text-base text-gray-600 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Free for students</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Interactive learning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Collaborative platform</span>
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
                  Interactive ML Learning Platform for Students & Educators
                </span>
              </div>             
            </div>
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-white/90 rounded-xl shadow-xl p-3 border border-gray-200/60">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>98% Learning Success</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white/90 rounded-xl shadow-xl p-3 border border-gray-200/60">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>10,000+ Students</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download ML Server Section */}
      <section id="ml-server-section" className="py-16 px-4 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* First Card - Download Options */}
          <div className="bg-white/95 rounded-3xl overflow-hidden shadow-xl border border-gray-200/60 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Side */}
              <div className="p-10">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Started with ML Server</h3>
                <p className="text-gray-700 mb-6">
                  Download our ML Server application to start your machine learning journey. Run models locally and experience seamless data processing.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="text-green-500">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="text-gray-700">Easy one-click installation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-500">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="text-gray-700">Local model processing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-green-500">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="text-gray-700">Secure data handling</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <a 
                    href="https://drive.google.com/uc?export=download&id=1q6IELQBQPhYuKSaClXwWr9AoplWAgM6P"
                    download="MLServer.exe"
                    className="inline-flex items-center gap-2 bg-[#4945FF] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#3532d6] transition-all duration-300 w-full justify-center group"
                    onClick={(e) => {
                      // Prevent default behavior
                      e.preventDefault();
                      
                      // Create loading state in the button
                      const button = e.currentTarget;
                      const originalContent = button.innerHTML;
                      button.innerHTML = `<div class="flex items-center gap-2"><svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Downloading...</div>`;
                      
                      // Start download
                      window.location.href = "https://drive.google.com/uc?export=download&id=1q6IELQBQPhYuKSaClXwWr9AoplWAgM6P";
                      
                      // Reset button after 3 seconds
                      setTimeout(() => {
                        button.innerHTML = originalContent;
                      }, 3000);
                    }}
                  >
                    <Download className="w-5 h-5 group-hover:animate-bounce" />
                    Download ML Server (.exe)
                  </a>
                  {/* <a 
                    href="YOUR_CLOUDINARY_DOWNLOAD_LINK_HERE"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 w-full justify-center"
                  >
                    <Download className="w-5 h-5" />
                    Download Backend Server (.exe)
                  </a> */}
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Version 1.0.0 | Windows 10/11 64-bit
                </p>
              </div>

              {/* Right Side - Video Preview */}
              <div className="bg-[#F7F7FF] p-10 flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Watch Learning Demo</h3>
                <div className="relative flex-1 rounded-xl overflow-hidden group cursor-pointer min-h-[300px]" onClick={() => setShowVideo(true)}>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center z-10">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-8 h-8 text-[#4945FF] ml-1" />
                    </div>
                  </div>
                  <div className="relative w-full h-full">
                    <Image 
                      src="/banner.png"
                      alt="Learning Demo Preview"
                      className="object-cover"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
                <p className="mt-4 text-gray-600 text-center">
                  Learn how to set up and use our ML platform in 2 minutes
                </p>
              </div>
            </div>
          </div>

          {/* Second Card - Setup Steps */}
          <div className="bg-white/95 rounded-3xl overflow-hidden shadow-xl border border-gray-200/60">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Start Your ML Journey</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#F7F7FF] p-6 rounded-xl">
                  <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4 mx-auto">
                    1
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-center">Install Backend Server</h4>
                  <p className="text-gray-600 text-center">
                    Download and install the backend server to enable local ML processing
                  </p>
                </div>
                <div className="bg-[#F7F7FF] p-6 rounded-xl">
                  <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4 mx-auto">
                    2
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-center">Access Web Platform</h4>
                  <p className="text-gray-600 text-center">
                    Open your web browser and access the ML platform with secure credentials
                  </p>
                </div>
                <div className="bg-[#F7F7FF] p-6 rounded-xl">
                  <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4 mx-auto">
                    3
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-3 text-center">Start Learning</h4>
                  <p className="text-gray-600 text-center">
                    Begin your ML journey with interactive tutorials and hands-on projects
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Modal */}
        {showVideo && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden">
              <button 
                onClick={() => setShowVideo(false)}
                className="absolute top-4 right-4 z-10 bg-white/90 rounded-full p-2 hover:bg-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="aspect-video">
                <video 
                  src="https://res.cloudinary.com/dws3beqwu/video/upload/v1750513405/wli81fl1tsjg8ui0qovp.mp4"
                  controls
                  className="w-full h-full object-cover"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Why Smart Data Analyzer? */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-white/80 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Why Choose Our ML Learning Platform?</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Discover what makes our educational platform perfect for mastering machine learning.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow border border-blue-100/60">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Hands-On Learning</h3>
            <p className="text-gray-700 text-sm">Practice with real datasets and interactive tutorials designed for deep understanding.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 shadow border border-purple-100/60">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">Complete ML Lifecycle</h3>
            <p className="text-gray-700 text-sm">Learn every step from data ingestion to model deployment in structured modules.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-6 shadow border border-blue-100/60">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Collaborative Environment</h3>
            <p className="text-gray-700 text-sm">Work with classmates and instructors in real-time collaborative workspace.</p>
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 shadow border border-purple-100/60">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">Educational Focus</h3>
            <p className="text-gray-700 text-sm">Curriculum designed by ML experts specifically for academic learning outcomes.</p>
          </div>
        </div>
      </section>

      {/* ML Learning Modules */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">ML Learning Modules</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Master each phase of the machine learning lifecycle with structured learning modules.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-blue-700 mb-1">Data Ingestion & Exploration</h3>
            <p className="text-gray-700 text-sm">Learn to import, explore, and understand your datasets effectively.</p>
          </div>
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-purple-700 mb-1">Data Preprocessing & Cleaning</h3>
            <p className="text-gray-700 text-sm">Master data quality assessment and preprocessing techniques.</p>
          </div>
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-blue-700 mb-1">Model Selection & Training</h3>
            <p className="text-gray-700 text-sm">Understand different algorithms and learn to build effective models.</p>
          </div>
          <div className="bg-white/90 rounded-xl p-5 shadow border border-gray-200/60">
            <h3 className="text-base font-semibold text-purple-700 mb-1">Evaluation & Deployment</h3>
            <p className="text-gray-700 text-sm">Learn to evaluate model performance and deploy ML solutions.</p>
          </div>
        </div>
      </section>

      {/* Learning Tools & Resources */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-white/80 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Learning Tools & Resources</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Access comprehensive tools designed for interactive ML education.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">Interactive Notebooks</span>
          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-xs font-semibold border border-purple-200/60 shadow">Whiteboard Collaboration</span>
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">Knowledge Base</span>
          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-xs font-semibold border border-purple-200/60 shadow">Quality Metrics</span>
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">Dataset Upload</span>
          <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-xs font-semibold border border-purple-200/60 shadow">Model Training</span>
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-2 rounded-full text-xs font-semibold border border-blue-200/60 shadow">Visualization Tools</span>
        </div>
      </section>

      {/* Student Success Stories */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/40">
        <div className="max-w-6xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Student Success Stories</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">See how students are mastering ML concepts with our educational platform.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60 text-left">
            <h3 className="text-base font-semibold text-blue-700 mb-1">Computer Science Dept</h3>
            <p className="text-gray-700 text-sm mb-2">&quot;Students grasped ML concepts 70% faster with hands-on practice and visual learning tools.&quot;</p>
            <span className="text-xs text-gray-500">Dr. Emma Chen, Professor</span>
          </div>
          <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60 text-left">
            <h3 className="text-base font-semibold text-purple-700 mb-1">Data Science Program</h3>
            <p className="text-gray-700 text-sm mb-2">&quot;The collaborative environment helped our students learn from each other effectively.&quot;</p>
            <span className="text-xs text-gray-500">Prof. James Rodriguez, Academic Director</span>
          </div>
          <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60 text-left">
            <h3 className="text-base font-semibold text-blue-700 mb-1">Engineering College</h3>
            <p className="text-gray-700 text-sm mb-2">&quot;Perfect platform for teaching end-to-end ML lifecycle to undergraduate students.&quot;</p>
            <span className="text-xs text-gray-500">Dr. Sofia Patel, ML Research Lead</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-white/80 border-b border-gray-200/40">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Everything you need to know about our ML learning platform.</p>
        </div>
        <div className="max-w-3xl mx-auto">
          {/* Simple collapsible FAQ (no animation) */}
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-blue-700 cursor-pointer">Is the platform suitable for beginners?</summary>
            <p className="text-gray-700 text-sm mt-2">Absolutely. Our curriculum starts from basics and progresses to advanced ML concepts with guided learning.</p>
          </details>
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-purple-700 cursor-pointer">Can educators create custom curricula?</summary>
            <p className="text-gray-700 text-sm mt-2">Yes, instructors can customize learning paths and create assignments tailored to their course needs.</p>
          </details>
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-blue-700 cursor-pointer">What datasets can students work with?</summary>
            <p className="text-gray-700 text-sm mt-2">Students can upload their own datasets or use our curated educational datasets across various domains.</p>
          </details>
          <details className="mb-4 bg-white/90 rounded-xl shadow border border-gray-200/60 p-4">
            <summary className="font-semibold text-purple-700 cursor-pointer">How does collaborative learning work?</summary>
            <p className="text-gray-700 text-sm mt-2">Students can share projects, collaborate on whiteboards, and learn together in real-time workspaces.</p>
          </details>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 sm:px-8 lg:px-12 bg-white/70 backdrop-blur-xl border-t border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-200 to-blue-200 text-purple-800 px-8 py-3 rounded-full mb-8 shadow-md">
              <Brain className="w-5 h-5" />
              <span className="font-bold text-base tracking-widest uppercase">ML LIFECYCLE JOURNEY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Complete ML Lifecycle Learning
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Educational ML Learning Platform for comprehensive machine learning education, from data ingestion to deployment.
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
              <span className="font-bold text-base tracking-widest uppercase">LEARNING STEPS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Complete ML Lifecycle Journey
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Master each stage of the machine learning lifecycle with our comprehensive learning path
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60">
              <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4">1</div>
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Data Ingestion</h3>
              <p className="text-gray-700 text-sm">Upload and explore tabular datasets in a secure educational environment</p>
            </div>
            <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60">
              <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4">2</div>
              <h3 className="text-lg font-semibold text-purple-700 mb-2">Data Quality Assessment</h3>
              <p className="text-gray-700 text-sm">Learn to evaluate data quality with 26+ automated metrics and comprehensive analysis</p>
            </div>
            <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60">
              <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4">3</div>
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Data Preprocessing</h3>
              <p className="text-gray-700 text-sm">Master cleaning, transformation, and feature engineering techniques with guided workflows</p>
            </div>
            <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60">
              <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4">4</div>
              <h3 className="text-lg font-semibold text-purple-700 mb-2">Model Selection</h3>
              <p className="text-gray-700 text-sm">Explore various ML algorithms and understand their appropriate use cases</p>
            </div>
            <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60">
              <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4">5</div>
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Model Training & Testing</h3>
              <p className="text-gray-700 text-sm">Train models with automated hyperparameter tuning and performance evaluation</p>
            </div>
            <div className="bg-white/90 rounded-xl p-6 shadow border border-gray-200/60">
              <div className="w-12 h-12 bg-[#4945FF] rounded-full flex items-center justify-center text-white font-bold mb-4">6</div>
              <h3 className="text-lg font-semibold text-purple-700 mb-2">Results & Deployment</h3>
              <p className="text-gray-700 text-sm">Analyze model performance and learn deployment concepts in a hands-on environment</p>
            </div>
          </div>
        </div>
      </section>
      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-100 to-purple-100 border-b border-gray-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-200 to-orange-200 text-yellow-800 px-8 py-3 rounded-full mb-8 shadow-md">
              <Star className="w-5 h-5" />
              <span className="font-bold text-base tracking-widest uppercase">STUDENT SUCCESS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Empowering Student Success
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Join thousands of students who are mastering machine learning with our educational platform
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
              <span className="font-bold text-base tracking-widest uppercase">EDUCATIONAL PRICING</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-8 tracking-tight drop-shadow-lg">
              Affordable Learning for Everyone
            </h2>
            <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-medium">
              Designed for students and educational institutions with flexible pricing and free access options
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-12 border border-blue-200/60 shadow-xl">
              <div className="text-center mb-10">
                <h3 className="text-3xl font-extrabold text-gray-900 mb-3">Student Plan</h3>
                <div className="text-6xl font-extrabold text-blue-700 mb-3">₹49</div>
                <div className="text-gray-700 text-lg font-medium">per MB processed</div>
              </div>
              <ul className="space-y-5 mb-10">
                {[
                  'Interactive ML tutorials',
                  'Collaborative workspaces',
                  'Dataset upload & management',
                  'Visualization tools',
                  'Educational support',
                  'Secure learning environment'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-gray-800 text-lg font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup"><button className="w-full bg-gradient-to-r from-blue-700 to-purple-700 text-white py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Start Learning Free &rarr;
              </button></Link>
            </div>
            <div className="bg-white/95 rounded-3xl p-12 border border-gray-200/60 shadow-xl backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Calculate Learning Costs</h3>
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
                  <span className="font-semibold text-lg">Learning Cost</span>
                  <span className="text-3xl font-extrabold text-blue-700">₹{calculatePrice(pricingSlider)}</span>
                </div>
                <div className="text-base text-gray-700 space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span>Base rate (₹49/MB)</span>
                    <span>₹{49 * pricingSlider}</span>
                  </div>
                  {pricingSlider >= 25 && (
                    <div className="flex justify-between text-green-700 font-bold">
                      <span>Student discount</span>
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
                  Begin Learning Journey
                </button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-gray-900 to-blue-900 text-white border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
              Educational ML Learning Platform
            </h2>
            <p className="text-base text-gray-300 max-w-2xl mx-auto">
              Smart Data Analyzer is a cloud-based educational platform designed to help students and early-stage practitioners understand the complete machine learning lifecycle. From raw data ingestion to model deployment, our platform provides hands-on learning experiences with interactive tools, collaborative features, and automated workflows in a no-code environment.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {[
              { number: '10,000+', label: 'Active Students', icon: Database },
              { number: '500+', label: 'Learning Modules', icon: Zap },
              { number: '98%', label: 'Success Rate', icon: TrendingUp },
              { number: '24/7', label: 'Expert Support', icon: Users }
            ].map((stat, index) => (
              <div key={index} className="group text-center">
                <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-white/20 transition-colors">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-2xl font-bold mb-1">{stat.number}</div>
                <div className="text-blue-200 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-gradient-to-r from-blue-700 to-purple-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            Start Your ML Journey Today
          </h2>
          <p className="text-base mb-8 opacity-90">
            Begin your machine learning journey with our comprehensive educational platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup"><button className="bg-white text-blue-700 px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Start Learning Free
            </button></Link>
            <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-white hover:text-blue-700 transition-all duration-300">
              View Curriculum
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
                <span className="text-2xl font-extrabold">Smart Data Analyzer</span>
              </div>
              <p className="text-gray-400 text-lg font-medium">
                Empowering students and educators to master machine learning through interactive, hands-on education.
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
            <p>&copy; 2025 Smart Data Analyzer. All rights reserved. Built with ❤️ for students and educators.</p>
          </div>
        </div>
      </footer>
      
      {/* AI Chatbot */}
      <SimpleAIChatbot />
    </div>
  );
};

export default EnhancedLanding;