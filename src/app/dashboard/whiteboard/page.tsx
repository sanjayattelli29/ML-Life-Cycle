
'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  PencilIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  PaintBrushIcon,
  SwatchIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';

interface DrawingPoint {
  x: number;
  y: number;
  color: string;
  thickness: number;
  tool: 'pen' | 'eraser';
}

interface DrawingPath {
  points: DrawingPoint[];
  color: string;
  thickness: number;
  tool: 'pen' | 'eraser';
}

const COLORS = [
  '#000000', // Black (default)
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
];

const BRUSH_SIZES = [2, 4, 6, 8, 12, 16, 20];

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState(4);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushPicker, setShowBrushPicker] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all paths
    paths.forEach(path => {
      if (path.points.length > 0) {
        context.beginPath();
        context.strokeStyle = path.tool === 'eraser' ? '#ffffff' : path.color;
        context.lineWidth = path.thickness;
        context.lineCap = 'round';
        context.lineJoin = 'round';

        if (path.tool === 'eraser') {
          context.globalCompositeOperation = 'destination-out';
        } else {
          context.globalCompositeOperation = 'source-over';
        }

        context.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(point => {
          context.lineTo(point.x, point.y);
        });
        context.stroke();
      }
    });

    // Draw current path
    if (currentPath.length > 0) {
      context.beginPath();
      context.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
      context.lineWidth = brushSize;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      if (currentTool === 'eraser') {
        context.globalCompositeOperation = 'destination-out';
      } else {
        context.globalCompositeOperation = 'source-over';
      }

      context.moveTo(currentPath[0].x, currentPath[0].y);
      currentPath.forEach(point => {
        context.lineTo(point.x, point.y);
      });
      context.stroke();
    }

    // Reset composite operation
    context.globalCompositeOperation = 'source-over';
  }, [paths, currentPath, currentColor, brushSize, currentTool]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getMousePos(e);
    const newPoint: DrawingPoint = {
      x: pos.x,
      y: pos.y,
      color: currentColor,
      thickness: brushSize,
      tool: currentTool,
    };
    setCurrentPath([newPoint]);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getTouchPos(e);
    const newPoint: DrawingPoint = {
      x: pos.x,
      y: pos.y,
      color: currentColor,
      thickness: brushSize,
      tool: currentTool,
    };
    setCurrentPath([newPoint]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);
    const newPoint: DrawingPoint = {
      x: pos.x,
      y: pos.y,
      color: currentColor,
      thickness: brushSize,
      tool: currentTool,
    };

    setCurrentPath(prev => [...prev, newPoint]);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const pos = getTouchPos(e);
    const newPoint: DrawingPoint = {
      x: pos.x,
      y: pos.y,
      color: currentColor,
      thickness: brushSize,
      tool: currentTool,
    };

    setCurrentPath(prev => [...prev, newPoint]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length > 0) {
      const newPath: DrawingPath = {
        points: currentPath,
        color: currentColor,
        thickness: brushSize,
        tool: currentTool,
      };
      setPaths(prev => [...prev, newPath]);
      setCurrentPath([]);
    }
  };

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const downloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    
    // Download the PDF
    pdf.save('whiteboard-drawing.pdf');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Whiteboard</h1>
            
            {/* Tool Selection */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentTool('pen')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  currentTool === 'pen'
                    ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                }`}
                title="Pen Tool"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentTool('eraser')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  currentTool === 'eraser'
                    ? 'bg-red-100 text-red-600 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                }`}
                title="Eraser Tool"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Color Picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                title="Color Picker"
              >
                <div 
                  className="w-6 h-6 rounded border-2 border-gray-300" 
                  style={{ backgroundColor: currentColor }}
                />
                <SwatchIcon className="w-4 h-4 text-gray-600" />
              </button>
              
              {showColorPicker && (
                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Colors</span>
                    <button
                      onClick={() => setShowColorPicker(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setCurrentColor(color);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded border-2 transition-all duration-200 ${
                          currentColor === color ? 'border-gray-400 scale-110' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Brush Size */}
            <div className="relative">
              <button
                onClick={() => setShowBrushPicker(!showBrushPicker)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                title="Brush Size"
              >
                <PaintBrushIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{brushSize}px</span>
              </button>
              
              {showBrushPicker && (
                <div className="absolute top-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Brush Size</span>
                    <button
                      onClick={() => setShowBrushPicker(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {BRUSH_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setBrushSize(size);
                          setShowBrushPicker(false);
                        }}
                        className={`flex items-center space-x-3 w-full px-3 py-2 rounded-lg transition-all duration-200 ${
                          brushSize === size ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className="rounded-full bg-gray-600"
                          style={{ 
                            width: `${Math.min(size, 16)}px`, 
                            height: `${Math.min(size, 16)}px` 
                          }}
                        />
                        <span className="text-sm">{size}px</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={clearCanvas}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-all duration-200"
              title="Clear Canvas"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="font-medium">Clear</span>
            </button>
            
            <button
              onClick={downloadPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-all duration-200"
              title="Download as PDF"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="font-medium">Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair bg-white"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawingTouch}
          onTouchMove={drawTouch}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Tool: {currentTool === 'pen' ? 'Pen' : 'Eraser'}</span>
            <span>Color: {currentColor}</span>
            <span>Size: {brushSize}px</span>
          </div>
          <div>
            Paths: {paths.length}
          </div>
        </div>
      </div>
    </div>
  );
}
