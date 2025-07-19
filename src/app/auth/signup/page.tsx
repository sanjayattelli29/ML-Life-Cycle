'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOTP] = useState('');
  const [userOTP, setUserOTP] = useState('');
  const router = useRouter();

  // Function to log user registration to n8n webhook
  const logUserRegistrationToWebhook = async (userEmail: string) => {
    try {
      const currentTime = new Date().toLocaleString();
      await fetch("https://n8n.editwithsanjay.in/webhook/log-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: userEmail,
          answer: `${currentTime} - New user created account successfully`
        })
      });
      console.log('User registration logged to n8n successfully');
    } catch (error) {
      console.error('Failed to log user registration to n8n:', error);
      // Don't show error to user as this is background logging
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!showOTPInput) {
      try {
        // First step: Send OTP
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            step: 'sendOTP',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }

        setOTP(data.otp);
        setShowOTPInput(true);
        setIsLoading(false);
      } catch (error) {
        setError((error as Error).message || 'An error occurred. Please try again.');
        setIsLoading(false);
      }
    } else {
      try {
        // Second step: Verify OTP and complete registration
        if (userOTP !== otp) {
          setError('Invalid OTP. Please try again.');
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            step: 'completeRegistration',
            otp: userOTP,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Something went wrong');
        }

        // Log the successful registration to n8n webhook
        logUserRegistrationToWebhook(email);

        router.push('/auth/signin?registered=true');
      } catch (error) {
        setError((error as Error).message || 'An error occurred. Please try again.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Abstract Background - Responsive sizing */}
      <div className="absolute inset-0">
        <div className="absolute top-10 sm:top-20 left-10 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-32 sm:top-60 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 sm:bottom-32 left-1/4 sm:left-1/3 w-52 sm:w-80 h-52 sm:h-80 bg-orange-400/5 rounded-full blur-3xl"></div>
        
        {/* Decorative Icons - Responsive positioning and sizing */}
        <div className="absolute top-16 sm:top-32 left-6 sm:left-12 text-orange-500/20 text-2xl sm:text-4xl">🚀</div>
        <div className="absolute top-24 sm:top-48 right-8 sm:right-16 text-orange-500/20 text-xl sm:text-3xl">💎</div>
        <div className="absolute bottom-32 sm:bottom-40 left-8 sm:left-16 text-orange-500/20 text-xl sm:text-3xl">⭐</div>
        <div className="absolute bottom-16 sm:bottom-24 right-12 sm:right-24 text-orange-500/20 text-2xl sm:text-4xl">🎯</div>
        <div className="absolute top-40 sm:top-64 left-1/4 text-orange-500/20 text-lg sm:text-2xl">✨</div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Section - Welcome Text */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-8 lg:py-0">
          <div className="max-w-lg w-full text-center lg:text-left">
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-4 sm:mb-6">
                <div className="w-8 sm:w-10 h-8 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl">🏠</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-white">DataViz-AI</span>
              </div>
              
              <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-full mb-6 sm:mb-8">
                <span className="text-orange-400 mr-2">⚡</span>
                <span className="text-orange-300 text-xs sm:text-sm font-medium">Join 10,000+ Students</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Start Your Journey
              <span className="block text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text">
                Into AI Analytics
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
              Join thousands of students and professionals who are already transforming their careers with 
              <span className="text-orange-400 font-semibold"> AI-powered data analysis</span>. 
              Start building your future today with our <span className="text-orange-400 font-semibold">revolutionary platform</span>.
            </p>

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <div className="flex items-center justify-center lg:justify-start text-gray-300">
                <span className="text-orange-400 mr-3">✅</span>
                <span className="text-sm sm:text-base">Advanced AI models & deep learning tools</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start text-gray-300">
                <span className="text-orange-400 mr-3">✅</span>
                <span className="text-sm sm:text-base">Real-time data visualization & insights</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start text-gray-300">
                <span className="text-orange-400 mr-3">✅</span>
                <span className="text-sm sm:text-base">Exceptional accuracy & lightning speed</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start text-gray-400 text-xs sm:text-sm space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="flex items-center">💳 No credit card required</span>
              <span className="flex items-center">⚡ Get started in under 2 minutes</span>
            </div>
          </div>
        </div>

        {/* Right Section - Sign Up Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-8 lg:py-0">
          <div className="w-full max-w-md">
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Create Account
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  Already have an account?{' '}
                  <Link 
                    href="/auth/signin" 
                    className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {!showOTPInput ? (
                  <>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={showOTPInput}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={showOTPInput}
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={showOTPInput}
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={showOTPInput}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      maxLength={6}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-center text-xl sm:text-2xl tracking-widest"
                      placeholder="000000"
                      value={userOTP}
                      onChange={(e) => setUserOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <p className="mt-2 text-xs sm:text-sm text-gray-400 text-center">
                      Enter the 6-digit code sent to your email
                    </p>
                  </div>
                )}

                {error && (
                  <div className="text-red-500 text-xs sm:text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : showOTPInput ? 'Verify Code' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700/50">
                <div className="text-center">
                  <p className="text-gray-400 text-xs sm:text-sm">
                    By signing up, you agree to our terms and start your AI journey
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}