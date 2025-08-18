'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRightIcon, ArrowLeftIcon, CheckCircleIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import SupportChatbot from '@/components/SupportChatbot';

// Pre-defined questions and answers
const STEP_QUESTIONS = {
  1: [
    { q: "I can't find the download link for the Backend Server.", a: "The download link is included in your setup instructions. Please check your email or official project page." },
    { q: "My antivirus flagged the file as unsafe.", a: "This is a false positive. The file is safe. You can whitelist it or temporarily disable antivirus during installation." },
    { q: "The download is very slow or keeps failing.", a: "Try a stable Wi-Fi or download using another browser (Chrome/Edge)." },
    { q: "I downloaded but the file seems corrupted.", a: "Delete and re-download the ZIP. Ensure download completed fully." },
  ],
  2: [
    { q: "I don't know how to extract the ZIP file.", a: "Right-click on the file → Select Extract All (Windows default) or use WinRAR/7zip." },
    { q: "The extracted folder is empty.", a: "The download was incomplete/corrupted. Please re-download and extract again." },
    { q: "I can't find Backend.exe inside the folder.", a: "Make sure you extracted all files, not just opened ZIP. Path should be: Backend Server\\DataVizAI_Launcher.exe." },
    { q: "I don't have permission to extract files.", a: "Right-click → Run as Administrator or extract to a different location (like Desktop)." },
  ],
  3: [
    { q: "Double-clicking does nothing.", a: "Ensure you extracted the folder properly, not running from inside ZIP. Try Run as Administrator." },
    { q: "A Windows Defender/SmartScreen popup appears.", a: "Click More Info → Run Anyway (safe file)." },
    { q: "It crashes immediately after opening.", a: "Make sure Python/Redis/etc. dependencies are installed by launcher automatically. If not, reinstall." },
    { q: "I get 'Port already in use' error.", a: "Another app is using the backend port. Close that app or change backend config port." },
  ],
  4: [
    { q: "CMD opens and closes immediately.", a: "Run from CMD manually to see errors → Open CMD → cd Backend Server → DataVizAI_Launcher.exe." },
    { q: "Dependencies are not being installed.", a: "Ensure internet connection is stable. The launcher installs required Python packages." },
    { q: "Success panel never appears.", a: "Wait until dependencies finish installing. If still stuck, re-run as Admin." },
    { q: "Success panel appears but is blank.", a: "Close and re-open. If persists, delete venv folder and re-run launcher." },
  ],
  5: [
    { q: "Status shows 'Unhealthy' instead of 'Healthy'.", a: "Restart launcher. Ensure port not blocked by firewall." },
    { q: "Browser can't connect to backend.", a: "Open http://127.0.0.1:5000 to check if backend is running." },
    { q: "Health check says 'Missing Dependency'.", a: "Re-run launcher as Admin to auto-install dependencies." },
    { q: "It keeps looping and never shows status.", a: "Likely a firewall/port issue. Restart PC, then re-run launcher." },
  ]
};

const SetupGuide = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      number: 1,
      title: "Download Backend Server",
      description: "1. Go to your welcome email\n2. Click the download link for Backend Server\n3. Save the ZIP file to a convenient location\n4. Make sure download completes fully\n5. If antivirus flags it, click 'Allow'/'Trust'",
      image: "/setup/step1.png"
    },
    {
      number: 2,
      title: "Extract Files",
      description: "1. Right-click the downloaded ZIP file\n2. Select 'Extract All'\n3. Choose extraction location (e.g., Desktop)\n4. Wait for extraction to complete\n5. Verify Backend.exe exists in extracted folder",
      image: "/setup/step2.png"
    },
    {
      number: 3,
      title: "Launch Backend",
      description: "1. Navigate to extracted folder\n2. Right-click DataVizAI_Launcher.exe\n3. Select 'Run as Administrator'\n4. If Windows SmartScreen appears, click 'More Info' → 'Run Anyway'\n5. Wait for launcher window to appear",
      image: "/setup/step3.png"
    },
    {
      number: 4,
      title: "Setup Dependencies",
      description: "1. Keep launcher window open\n2. Wait for automatic package installation\n3. Do not close any CMD windows that appear\n4. Watch for success message\n5. If stuck, check your internet connection",
      image: "/setup/step4.png"
    },
    {
      number: 5,
      title: "Verify Connection",
      description: "1. Wait for 'Status: Healthy' message\n2. Check backend URL: http://127.0.0.1:5000\n3. Ensure no firewall blocks\n4. Look for green checkmarks\n5. Click 'Connect' when ready",
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
                    <div className="text-gray-600 mb-6 space-y-2">
                      {step.description.split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="min-w-[24px] h-6 flex items-center">
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          </div>
                          <p>{line}</p>
                        </div>
                      ))}
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

      {/* Support Chatbot */}
      <SupportChatbot
        activeStep={activeStep}
        stepQuestions={STEP_QUESTIONS}
      />
    </div>
  );
};

export default SetupGuide;
    