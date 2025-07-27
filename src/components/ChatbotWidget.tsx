'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [iframe, setIframe] = useState(null);
  const [showWelcomeText, setShowWelcomeText] = useState(true);
  
  // Get current pathname
  const pathname = usePathname();
  
  // Check if we should hide chatbot on this page
const shouldHideChatbot = pathname === '/dashboard/quality-metrics' || pathname === '/dashboard/ai-analysis'  || pathname === '/dashboard/knowledge';
  

  useEffect(() => {
    if (isOpen && !iframe && !shouldHideChatbot) {
      // Create and append the iframe when chatbot is opened
      const newIframe = document.createElement('iframe');
      newIframe.src = 'https://www.chatbase.co/chatbot-iframe/zMgvWytxkdwLvXhUWf4Z1';
      newIframe.style.position = 'fixed';
      newIframe.style.bottom = '90px';
      newIframe.style.right = '20px';
      newIframe.style.width = '380px';
      newIframe.style.height = '550px';
      newIframe.style.border = 'none';
      newIframe.style.borderRadius = '16px';
      newIframe.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
      newIframe.style.zIndex = '9999';
      newIframe.style.transition = 'all 0.3s ease';
      newIframe.style.backgroundColor = 'white';
      
      // Prevent iframe from affecting page scroll
      newIframe.style.pointerEvents = 'auto';
      newIframe.setAttribute('scrolling', 'no');
      
      document.body.appendChild(newIframe);
      setIframe(newIframe);
      
      // Hide welcome text when chatbot opens
      setShowWelcomeText(false);
    } else if (!isOpen && iframe) {
      // Remove iframe when chatbot is closed
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setIframe(null);
    }

    // Cleanup function
    return () => {
      if (iframe && document.body.contains(iframe)) {
        try {
          document.body.removeChild(iframe);
        } catch (error) {
          console.warn('Iframe already removed:', error);
        }
      }
    };
  }, [isOpen, iframe, shouldHideChatbot]);

  // Show welcome text again after page reload
  useEffect(() => {
    if (!shouldHideChatbot) {
      const timer = setTimeout(() => {
        if (!isOpen) {
          setShowWelcomeText(true);
        }
      }, 2000); // Show after 2 seconds of page load

      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldHideChatbot]);

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowWelcomeText(false);
    }
  };

const handleWelcomeClick = () => {
  setShowWelcomeText(false);
  // Removed the setTimeout so it won't reappear automatically
};


  // Prevent body scroll when iframe is focused
  useEffect(() => {
    if (isOpen && !shouldHideChatbot) {
      const preventScroll = (e) => {
        const target = e.target;
        const isIframe = target.tagName === 'IFRAME' || target.closest('iframe');
        if (isIframe) {
          e.stopPropagation();
        }
      };

      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });

      return () => {
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isOpen, shouldHideChatbot]);

  // Don't render chatbot if it should be hidden on this page
  if (shouldHideChatbot) {
    return null;
  }

  return (
    <>
      Welcome Text Bubble
      {showWelcomeText && !isOpen && (
        <div
          onClick={handleWelcomeClick}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '90px',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)',
            zIndex: '9998',
            maxWidth: '200px',
            animation: 'bounce 2s infinite',
            transition: 'all 0.3s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          // onMouseEnter={(e) => {
          //   const target = e.target as HTMLDivElement;
          //   target.style.transform = 'scale(1.05)';
          //   target.style.backgroundColor = '#0056b3';
          // }}
          // onMouseLeave={(e) => {
          //   const target = e.target as HTMLDivElement;
          //   target.style.transform = 'scale(1)';
          //   target.style.backgroundColor = '#007bff';
          // }}
        >
          {/* 👋 Hey! Need help? */}
          {/* Speech bubble tail */}
          <div
            // style={{
            //   position: 'absolute',
            //   bottom: '-8px',
            //   right: '20px',
            //   width: '0',
            //   height: '0',
            //   borderLeft: '8px solid transparent',
            //   borderRight: '8px solid transparent',
            //   borderTop: '8px solid #007bff',
            // }}
          />
        </div>
      )}

      {/* Chatbot Toggle Button */}
      <button
        onClick={toggleChatbot}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '65px',
          height: '65px',
          borderRadius: '50%',
          backgroundColor: '#007bff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0, 123, 255, 0.4)',
          zIndex: '10000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={(e) => {
          const target = e.target as HTMLButtonElement;
          target.style.transform = isOpen ? 'rotate(45deg) scale(1.1)' : 'rotate(0deg) scale(1.1)';
          target.style.backgroundColor = '#0056b3';
          target.style.boxShadow = '0 8px 20px rgba(0, 123, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLButtonElement;
          target.style.transform = isOpen ? 'rotate(45deg) scale(1)' : 'rotate(0deg) scale(1)';
          target.style.backgroundColor = '#007bff';
          target.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.4)';
        }}
      >
        {isOpen ? (
          // Close icon (X)
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          // Chat icon
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <circle cx="9" cy="10" r="1" fill="white"></circle>
            <circle cx="15" cy="10" r="1" fill="white"></circle>
          </svg>
        )}
      </button>

      {/* CSS Animation Keyframes */}
      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;