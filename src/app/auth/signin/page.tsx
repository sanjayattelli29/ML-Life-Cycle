'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">

        {/* Left Section - Welcome Text */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">DataViz-AI</span>
            </div>

            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
              <span className="text-blue-600 mr-2">⚡</span>
              <span className="text-blue-700 text-sm font-medium">Trusted by 10,000+ Students</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Welcome Back to <br />
            <span className="text-blue-600">
              Smart Analytics
            </span>
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Transform your data into <span className="text-blue-600 font-semibold">actionable insights</span> with our revolutionary AI-powered platform.
            Analyze, visualize, and predict with <span className="text-blue-600 font-semibold">exceptional accuracy</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start text-gray-500 text-sm space-y-2 sm:space-y-0 sm:space-x-6">
            <span className="flex items-center">
              <span className="mr-2">💳</span>
              <span>No credit card required</span>
            </span>
            <span className="flex items-center">
              <span className="mr-2">⚡</span>
              <span>Get started in under 2 minutes</span>
            </span>
          </div>
        </div>

        {/* Right Section - Sign In Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Sign In
              </h2>
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Create one
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700">Forgot password?</a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <div className="text-red-600 text-sm text-center font-medium">{error}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Sign In</span>
                    <span className="ml-2">→</span>
                  </div>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  Secure sign-in powered by AI agents & deep learning
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}