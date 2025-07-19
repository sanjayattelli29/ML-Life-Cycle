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
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0">
        <div className="absolute top-10 sm:top-20 left-10 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-32 sm:top-60 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-orange-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 sm:bottom-32 left-1/4 sm:left-1/3 w-56 sm:w-80 h-56 sm:h-80 bg-orange-400/5 rounded-full blur-3xl"></div>
        
        {/* Decorative Icons - Responsive positioning */}
        <div className="absolute top-16 sm:top-32 left-6 sm:left-12 text-orange-500/20 text-2xl sm:text-4xl">📊</div>
        <div className="absolute top-32 sm:top-48 right-8 sm:right-16 text-orange-500/20 text-xl sm:text-3xl">📈</div>
        <div className="absolute bottom-32 sm:bottom-40 left-8 sm:left-16 text-orange-500/20 text-xl sm:text-3xl">⚡</div>
        <div className="absolute bottom-16 sm:bottom-24 right-12 sm:right-24 text-orange-500/20 text-2xl sm:text-4xl">🔥</div>
        <div className="absolute top-48 sm:top-64 left-1/4 text-orange-500/20 text-lg sm:text-2xl">💡</div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Section - Welcome Text */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-16 py-8 lg:py-0">
          <div className="max-w-lg w-full text-center lg:text-left">
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-4 sm:mb-6">
                <div className="w-8 sm:w-10 h-8 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl">🏠</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-white">DataViz-AI</span>
              </div>
              
              <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500/20 border border-orange-500/30 rounded-full mb-6 sm:mb-8">
                <span className="text-orange-400 mr-2">⚡</span>
                <span className="text-orange-300 text-xs sm:text-sm font-medium">Trusted by 10,000+ Students</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Welcome Back to
              <span className="block text-transparent bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text">
                Smart Analytics
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
              Transform your data into <span className="text-orange-400 font-semibold">actionable insights</span> with our revolutionary AI-powered platform.
              Analyze, visualize, and predict with <span className="text-orange-400 font-semibold">exceptional accuracy</span> and speed.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start text-gray-400 text-xs sm:text-sm space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="flex items-center">
                <span className="mr-1">💳</span>
                <span>No credit card required</span>
              </span>
              <span className="flex items-center">
                <span className="mr-1">⚡</span>
                <span>Get started in under 2 minutes</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Section - Sign In Form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 lg:px-16 py-8 lg:py-0">
          <div className="w-full max-w-md">
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Sign In
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Don't have an account?{' '}
                  <Link 
                    href="/auth/signup" 
                    className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    Create one
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    autoComplete="current-password"
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <div className="text-red-400 text-sm text-center">{error}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2.5 sm:py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
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

              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700/50">
                <div className="text-center">
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Secure sign-in powered by AI agents & deep learning
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