"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, MessageSquare } from 'lucide-react';

export default function KnowledgePage() {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const newIframe = document.createElement('iframe');
    newIframe.src = 'https://www.chatbase.co/chatbot-iframe/zMgvWytxkdwLvXhUWf4Z1';
    newIframe.style.width = '100%';
    newIframe.style.height = '100%';
    newIframe.style.border = 'none';
    newIframe.style.borderRadius = '12px';
    newIframe.style.backgroundColor = 'white';
    newIframe.style.minHeight = 'calc(100vh - 12rem)'; // Ensure minimum height
    newIframe.style.overflowY = 'auto'; // Enable vertical scrolling

    const container = document.getElementById('chatbot-container');
    if (container) {
      container.appendChild(newIframe);
      setIframe(newIframe);
    }

    return () => {
      if (newIframe && newIframe.parentNode) {
        newIframe.parentNode.removeChild(newIframe);
      }
    };
  }, []);

  return (    <div className="flex flex-col min-h-screen bg-white text-black">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
          <Brain className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">AI Knowledge Assistant</h1>
          <p className="text-gray-700">Get instant answers about data quality and preprocessing</p>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 border-0 bg-white shadow-none">

        <CardContent className="p-0 flex flex-col flex-1">
          <div
            id="chatbot-container"
            className="flex-1 w-full overflow-y-auto bg-white min-h-[calc(100vh-12rem)]"
          />
        </CardContent>
      </Card>
    </div>
  );
}
