import React, { useRef, useEffect, useState } from 'react';
import { Download, BarChart3 } from 'lucide-react';

interface EnhancedChartProps {
  analysisResult: {
    metric_scores: Record<string, number>;
  };
}

const EnhancedChart: React.FC<EnhancedChartProps> = ({ analysisResult }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisResult?.metric_scores) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Chart data
    const metrics = Object.entries(analysisResult.metric_scores);
    const maxScore = 100;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / metrics.length * 0.7;
    const barSpacing = chartWidth / metrics.length * 0.3;

    // Draw gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'rgba(139, 92, 246, 0.05)');
    bgGradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw bars
    metrics.forEach(([metric, score], index) => {
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const barHeight = (score / maxScore) * chartHeight;
      const y = height - padding - barHeight;

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      if (score >= 80) {
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#059669');
      } else if (score >= 60) {
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#d97706');
      } else {
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#dc2626');
      }

      // Draw bar shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(x + 2, y + 2, barWidth, barHeight);
      
      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw bar highlight
      const highlightGradient = ctx.createLinearGradient(0, y, 0, y + barHeight * 0.3);
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.fillRect(x, y, barWidth, barHeight * 0.3);

      // Draw score text on bars
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(score)}%`, x + barWidth / 2, y + 25);

      // Draw metric names
      ctx.fillStyle = '#475569';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const words = metric.split(' ');
      words.forEach((word, wordIndex) => {
        ctx.fillText(word, x + barWidth / 2, height - padding + 20 + wordIndex * 15);
      });
    });

    // Draw Y-axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = (maxScore * (5 - i)) / 5;
      const y = padding + (chartHeight * i) / 5;
      ctx.fillText(`${value}%`, padding - 10, y + 4);
    }

    // Draw title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Performance Metrics', padding, 30);

  }, [analysisResult]);

  const downloadChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'metric-performance-chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="group relative">
      <div className="relative backdrop-blur-sm bg-gradient-to-br from-slate-50/90 to-white/70 rounded-3xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-700 overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/30 via-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative h-2 bg-gradient-to-r from-slate-100/50 to-slate-200/50 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 transition-all duration-1000 ease-out" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-pulse opacity-60"></div>
        </div>

        <div className="relative p-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 hover:rotate-6 hover:scale-110"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <BarChart3 className={`w-6 h-6 text-white transition-all duration-300 ${isHovered ? 'scale-110' : ''}`} />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">
                  Metric Performance Overview
                </h3>
                <p className="text-sm text-slate-500 font-medium">Real-time analytics dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg"></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg" style={{animationDelay: '0.5s'}}></div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse shadow-lg" style={{animationDelay: '1s'}}></div>
              </div>
              
              <button
                onClick={downloadChart}
                className="group/btn relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Download className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" />
                <span className="text-sm font-semibold">Download PNG</span>
                
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 animate-ping"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="relative px-8 pb-8">
          <div className="relative bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-inner overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-blue-100"></div>
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
                                 radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`
              }}></div>
            </div>
            
            <div 
              className="relative w-full h-[400px]" 
              id="chart-container"
              style={{ 
                padding: '20px',
                position: 'relative'
              }}
            >
              <canvas 
                ref={canvasRef}
                className="transition-all duration-300 hover:scale-[1.01]"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-60"></div>
          </div>
        </div>
        
        <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 bg-gradient-to-r from-blue-400 to-violet-400 rounded-full opacity-60 animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-violet-400 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-1000"
              style={{
                top: `${20 + i * 30}%`,
                right: `${15 + i * 10}%`,
                animationDelay: `${i * 0.5}s`,
                animation: 'float 4s ease-in-out infinite'
              }}
            />
          ))}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1); 
          }
          33% { 
            transform: translateY(-8px) rotate(120deg) scale(1.1); 
          }
          66% { 
            transform: translateY(-4px) rotate(240deg) scale(0.9); 
          }
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
};

export default EnhancedChart;
