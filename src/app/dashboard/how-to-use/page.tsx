'use client';
import { useState, useRef } from 'react';

export default function HowToUse() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setShowOverlay(false);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoClick = (e) => {
    e.preventDefault();
    handlePlayPause();
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowOverlay(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Video Section - Reduced Size */}
      <div className="mb-12 flex justify-center">
        <div className="relative w-full max-w-5xl">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
            <video
              ref={videoRef}
              className="w-full h-full object-cover cursor-pointer"
              preload="metadata"
              poster="/banner.png"
              onClick={handleVideoClick}
              onEnded={handleVideoEnded}
              controls={isPlaying}
            >
              <source
                src="https://res.cloudinary.com/dws3beqwu/video/upload/v1750513405/wli81fl1tsjg8ui0qovp.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            
            {/* Play Button Overlay */}
            {showOverlay && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20"
                onClick={handlePlayPause}
              >
                <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center cursor-pointer hover:bg-opacity-100 hover:scale-110 transition-all duration-300 shadow-lg">
                  <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-indigo-600 border-b-[15px] border-b-transparent ml-2"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Complete ML Lifecycle Learning</h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white text-lg font-bold">
                1
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Data Ingestion</h3>
            </div>
            <p className="text-gray-600">Upload and explore tabular datasets in a secure educational environment</p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white text-lg font-bold">
                2
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Data Quality Assessment</h3>
            </div>
            <p className="text-gray-600">Learn to evaluate data quality with 26+ automated metrics and comprehensive analysis</p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white text-lg font-bold">
                3
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Data Preprocessing</h3>
            </div>
            <p className="text-gray-600">Master cleaning, transformation, and feature engineering techniques with guided workflows</p>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white text-lg font-bold">
                4
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Model Selection</h3>
            </div>
            <p className="text-gray-600">Explore various ML algorithms and understand their appropriate use cases</p>
          </div>

          {/* Step 5 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white text-lg font-bold">
                5
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Model Training & Testing</h3>
            </div>
            <p className="text-gray-600">Train models with automated hyperparameter tuning and performance evaluation</p>
          </div>

          {/* Step 6 */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-500 text-white text-lg font-bold">
                6
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Results & Deployment</h3>
            </div>
            <p className="text-gray-600">Analyze model performance and learn deployment concepts in a hands-on environment</p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-16 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h2>
          <p className="text-gray-600">Our support team is ready to assist you with any questions or issues</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Email Support */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Email Support</h3>
            </div>
            <a 
              href="mailto:datavizai29@gmail.com" 
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              datavizai29@gmail.com
            </a>
          </div>

          {/* Phone Support */}
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Phone Support</h3>
            </div>
            <a 
              href="tel:+918977300290" 
              className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              +91 89773 00290
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}