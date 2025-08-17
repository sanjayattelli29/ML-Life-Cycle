'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRightIcon, PhoneIcon, EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const SetupGuide = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      number: 1,
      title: "Download Backend Server",
      description: "Download our ML backend server package to enable local model processing",
      image: "/setup/step1.png"
    },
    {
      number: 2,
      title: "Install Dependencies",
      description: "Install required Python packages and dependencies",
      image: "/setup/step2.png"
    },
    {
      number: 3,
      title: "Configure Environment",
      description: "Set up your environment variables and configuration",
      image: "/setup/step3.png"
    },
    {
      number: 4,
      title: "Start Backend Server",
      description: "Launch the backend server and verify it's running",
      image: "/setup/step4.png"
    },
    {
      number: 5,
      title: "Connect to Platform",
      description: "Connect your local backend to the DataViz-AI platform",
      image: "/setup/step5.png"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-gray-200/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            <nav className="flex space-x-8">
              <a href="#overview" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">Overview</a>
              <a href="#setup-steps" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">Setup Steps</a>
              <a href="#contact" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">Contact Support</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overview Section */}
        <section id="overview" className="mb-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Setup Guide
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Follow these steps to set up your local ML backend server and get started with DataViz-AI
            </p>
          </div>
        </section>

        {/* Setup Steps Section */}
        <section id="setup-steps" className="mb-16">
          <div className="max-w-5xl mx-auto">
            {steps.map((step) => (
              <div 
                key={step.number}
                className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200/40 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {step.number}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6">{step.description}</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        <span>Detailed instructions provided</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        <span>Video tutorial available</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2 bg-gray-100 p-6 flex items-center justify-center">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200">
                      {/* Replace with actual setup images */}
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        Image Placeholder
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Support Section */}
        <section id="contact" className="mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Our support team is ready to assist you with any questions or issues
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200/40 p-6">
                <div className="flex items-center gap-3 justify-center mb-4">
                  <EnvelopeIcon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
                </div>
                <a 
                  href="mailto:datavizai29@gmail.com"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  datavizai29@gmail.com
                </a>
              </div>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200/40 p-6">
                <div className="flex items-center gap-3 justify-center mb-4">
                  <PhoneIcon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
                </div>
                <a 
                  href="tel:+918977300290"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  +91 89773 00290
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SetupGuide;
    