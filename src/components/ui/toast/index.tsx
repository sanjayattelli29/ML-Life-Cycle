'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

interface ToastOptions extends Omit<ToastProps, 'message'> {}

// Toast component
const ToastComponent: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for fade out animation
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default: return 'bg-blue-50 border-blue-200';
    }
  };
  
  return (
    <div 
      className={`fixed bottom-4 right-4 flex items-center p-4 mb-4 rounded-lg border ${getBgColor()} transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      role="alert"
    >
      <div className="inline-flex items-center justify-center flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="text-sm font-normal max-w-xs">{message}</div>
      <button 
        type="button" 
        className="ml-3 -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-gray-200"
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => {
            onClose?.();
          }, 300);
        }}
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

// Toast container
const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return createPortal(
    <div className="fixed bottom-0 right-0 p-4 z-50 flex flex-col items-end space-y-4">
      {children}
    </div>,
    document.body
  );
};

// Toast manager
class ToastManager {
  private static instance: ToastManager;
  private toasts: { id: string; component: React.ReactNode }[] = [];
  private setToasts: React.Dispatch<React.SetStateAction<{ id: string; component: React.ReactNode }[]>> | null = null;
  
  private constructor() {}
  
  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }
  
  public setToastSetter(setter: React.Dispatch<React.SetStateAction<{ id: string; component: React.ReactNode }[]>>): void {
    this.setToasts = setter;
  }
  
  public show(message: string, options?: ToastOptions): string {
    const id = Math.random().toString(36).substring(2, 9);
    
    const component = (
      <ToastComponent
        key={id}
        message={message}
        type={options?.type}
        duration={options?.duration}
        onClose={() => this.remove(id)}
      />
    );
    
    this.toasts = [...this.toasts, { id, component }];
    this.setToasts?.(this.toasts);
    
    return id;
  }
  
  public remove(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.setToasts?.(this.toasts);
  }
  
  public getToasts(): { id: string; component: React.ReactNode }[] {
    return this.toasts;
  }
}

// Toast provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: string; component: React.ReactNode }[]>([]);
  
  useEffect(() => {
    const toastManager = ToastManager.getInstance();
    toastManager.setToastSetter(setToasts);
    
    return () => {
      toastManager.setToastSetter(null);
    };
  }, []);
  
  return (
    <>
      {children}
      {toasts.length > 0 && (
        <ToastContainer>
          {toasts.map(toast => toast.component)}
        </ToastContainer>
      )}
    </>
  );
};

// Toast functions
export const toast = {
  show: (message: string, options?: ToastOptions): string => {
    return ToastManager.getInstance().show(message, options);
  },
  success: (message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return ToastManager.getInstance().show(message, { ...options, type: 'success' });
  },
  error: (message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return ToastManager.getInstance().show(message, { ...options, type: 'error' });
  },
  warning: (message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return ToastManager.getInstance().show(message, { ...options, type: 'warning' });
  },
  info: (message: string, options?: Omit<ToastOptions, 'type'>): string => {
    return ToastManager.getInstance().show(message, { ...options, type: 'info' });
  },
};
