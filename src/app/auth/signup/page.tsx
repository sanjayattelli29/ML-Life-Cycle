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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">

        {/* Left Section - Welcome Text */}
        <div className="text-center lg:text-left space-y-8 order-2 lg:order-1 lg:block hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">DataViz-AI</span>
            </div>

            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
              <span className="text-blue-600 mr-2">⚡</span>
              <span className="text-blue-700 text-sm font-medium">Join 10,000+ Students</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Start Your Journey <br />
            <span className="text-blue-600">
              Into AI Analytics
            </span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Join thousands of students and professionals who are already transforming their careers with
            <span className="text-blue-600 font-semibold"> AI-powered data analysis</span>.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start text-gray-600">
              <span className="text-blue-600 mr-3">✅</span>
              <span className="text-base">Advanced AI models & deep learning tools</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start text-gray-600">
              <span className="text-blue-600 mr-3">✅</span>
              <span className="text-base">Real-time data visualization & insights</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start text-gray-600">
              <span className="text-blue-600 mr-3">✅</span>
              <span className="text-base">Exceptional accuracy & lightning speed</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start text-gray-500 text-sm space-y-2 sm:space-y-0 sm:space-x-6">
            <span className="flex items-center">💳 No credit card required</span>
            <span className="flex items-center">⚡ Get started in under 2 minutes</span>
          </div>
        </div>

        {/* Right Section - Sign Up Form */}
        <div className="w-full max-w-md mx-auto order-1 lg:order-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Create Account
              </h2>
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!showOTPInput ? (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={showOTPInput}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={showOTPInput}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={showOTPInput}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={showOTPInput}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✉️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Verify your email</h3>
                    <p className="text-sm text-gray-500 mt-1">We've sent a code to {email}</p>
                  </div>

                  <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                    value={userOTP}
                    onChange={(e) => setUserOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    Can't find the email? Check your spam folder
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="text-red-600 text-sm text-center font-medium">{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : showOTPInput ? 'Verify Code' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  By signing up, you agree to our terms and start your AI journey
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}