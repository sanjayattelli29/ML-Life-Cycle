import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };
  
  return (
    <div className="relative inline-block">
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex"
      >
        {children}
      </div>
      
      {isVisible && (
        <div 
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap ${positionClasses[position]}`}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
              position === 'top' ? 'top-full -translate-x-1/2 left-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full -translate-x-1/2 left-1/2 -mb-1' :
              position === 'left' ? 'left-full -translate-y-1/2 top-1/2 -ml-1' :
              'right-full -translate-y-1/2 top-1/2 -mr-1'
            }`}
          />
        </div>
      )}
    </div>
  );
};
