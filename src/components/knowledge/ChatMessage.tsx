import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`flex ${role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          role === 'assistant'
            ? 'bg-white border border-gray-200'
            : 'bg-blue-600 text-white'
        }`}
      >
        <p className="text-sm">{content}</p>
      </div>
    </div>
  );
}
