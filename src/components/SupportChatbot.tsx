'use client';

import { useState } from 'react';
import { EnvelopeIcon, PhoneIcon, ArrowRightIcon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ChatMessage {
  type: 'question' | 'answer';
  text: string;
}

interface SupportChatbotProps {
  activeStep: number;
  stepQuestions: Record<number, Array<{ q: string; a: string; }>>;
}

const STEPS = [1, 2, 3, 4, 5];
const MAX_AI_QUESTIONS = 4;

export default function SupportChatbot({ activeStep, stepQuestions }: SupportChatbotProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [aiQuestionsCount, setAiQuestionsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const logToN8n = async (question: string, answer: string) => {
    try {
      const response = await fetch('https://n8n.editwithsanjay.in/webhook/issue-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Issue: question,
          Reply: answer
        })
      });
      
      if (!response.ok) {
        console.error('Failed to log chat to n8n');
      }
    } catch (error) {
      console.error('Error logging chat to n8n:', error);
    }
  };

  const handleQuestionSelect = async (question: string) => {
    const currentStepQuestions = stepQuestions[selectedStep || activeStep];
    const answer = currentStepQuestions.find(q => q.q === question)?.a;
    
    if (answer) {
      setChatHistory([...chatHistory, 
        { type: 'question', text: question },
        { type: 'answer', text: answer }
      ]);
      setSelectedQuestion('');
      setSelectedStep(null); // Reset step selection after answering
      
      // Log to n8n
      await logToN8n(question, answer);
    }
  };

  const handleCustomQuestion = async () => {
    if (!customQuestion.trim() || isLoading) return;

    const question = customQuestion.trim();
    setCustomQuestion('');
    setIsLoading(true);
    setChatHistory(prev => [...prev, { type: 'question', text: question }]);

    try {
      if (aiQuestionsCount >= MAX_AI_QUESTIONS) {
        const defaultResponse = "I'll need to look into that specific issue. In the meantime, please check our documentation or contact support at datavizai29@gmail.com";
        setChatHistory(prev => [...prev, { type: 'answer', text: defaultResponse }]);
        await logToN8n(question, defaultResponse);
        return;
      }

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          temperature: 0.3,
          max_tokens: 100,
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful assistant specializing in DataVizAI backend setup issues. Provide brief, direct answers. No explanations unless asked.' 
            },
            { role: 'user', content: question }
          ]
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not process your request.';
      
      setChatHistory(prev => [...prev, { type: 'answer', text: aiResponse }]);
      setAiQuestionsCount(prev => prev + 1);
      await logToN8n(question, aiResponse);
    } catch (error) {
      console.error('AI response error:', error);
      const errorResponse = "Sorry, I couldn't process your request. Please try again or contact support.";
      setChatHistory(prev => [...prev, { type: 'answer', text: errorResponse }]);
      await logToN8n(question, errorResponse);
    } finally {
      setIsLoading(false);
      setShowCustomInput(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
        >
          <EnvelopeIcon className="w-5 h-5" />
          <span>Open Support Chat</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 w-[450px] bg-white rounded-lg shadow-xl border border-gray-200 max-h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900">Setup Assistant</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`mb-4 ${msg.type === 'question' ? 'text-right' : ''}`}>
            <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
              msg.type === 'question' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-900 border border-gray-200'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200">
        {!selectedStep ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-2">Select your setup step:</p>
            <div className="grid grid-cols-5 gap-2">
              {STEPS.map((step) => (
                <button
                  key={step}
                  onClick={() => setSelectedStep(step)}
                  className={`p-4 text-center rounded-lg border-2 text-base font-medium transition-all
                    ${activeStep === step 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:shadow'}`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
        ) : !showCustomInput ? (
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute bottom-full mb-2 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {stepQuestions[selectedStep]?.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuestionSelect(q.q)}
                    className="w-full p-4 text-left hover:bg-gray-50 border-b last:border-b-0 text-base text-gray-900"
                  >
                    {q.q}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full p-3 text-left text-blue-600 hover:bg-blue-50 text-sm font-medium"
                >
                  None of the above - Ask custom question
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedStep(null)}
                  className="p-4 border-2 rounded-lg text-base text-gray-700 hover:bg-gray-50 hover:border-blue-400 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setSelectedQuestion(selectedQuestion ? '' : 'show')}
                  className="flex-1 p-3 text-left bg-white border rounded-lg text-sm flex justify-between items-center"
                >
                  <span className="text-gray-600">
                    {selectedQuestion || `Select a question for Step ${selectedStep}...`}
                  </span>
                  <ChevronRightIcon className="w-4 h-4 transform -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomQuestion('');
                }}
                className="p-3 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                ← Back
              </button>
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="flex-1 p-4 border-2 rounded-lg text-base text-black placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                disabled={isLoading}
              />
              <button
                onClick={handleCustomQuestion}
                className="px-5 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRightIcon className="h-6 w-6" />
                )}
              </button>
            </div>
            {aiQuestionsCount >= MAX_AI_QUESTIONS && (
              <p className="text-xs text-gray-500 text-center">
                Youve reached the maximum number of AI responses. Please check our documentation or contact support for further assistance.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <a
            href="mailto:datavizai29@gmail.com"
            className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
          >
            <EnvelopeIcon className="w-4 h-4 mr-1" />
            Email Support
          </a>
          
          <button
            onClick={() => setIsMinimized(true)}
            className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Close Chat
          </button>

          <a
            href="tel:+918977300290"
            className="flex items-center text-gray-600 hover:text-gray-900 text-sm"
          >
            <PhoneIcon className="w-4 h-4 mr-1" />
            Call Support
          </a>
        </div>
      </div>
    </div>
  );
}
