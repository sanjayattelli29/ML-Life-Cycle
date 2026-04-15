import React, { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { MicrophoneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';

let globalVapi: Vapi | null = null;

const stopGlobalVapi = async () => {
  if (globalVapi) {
    try {
      globalVapi.stop();
      await new Promise(resolve => setTimeout(resolve, 400)); // only when something is running
    } catch (e) {
      console.warn('Vapi teardown error:', e);
    } finally {
      globalVapi = null;
    }
  }
  // If globalVapi is null — return immediately, no delay
};

interface VapiCallWidgetProps {
  apiKey: string;
  assistantId: string;
  isOpen: boolean;
  onClose: () => void;
}

const VapiCallWidget: React.FC<VapiCallWidgetProps> = ({ apiKey, assistantId, isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const onCloseRef = useRef(onClose);
  
  // Keep onClose ref stable so useEffect doesn't re-run on every render
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const startRinging = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const createOscillator = (freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);

        let active = true;
        const loopRinging = () => {
          if (!active || !audioCtxRef.current) return;
          const now = ctx.currentTime;
          gain.gain.setTargetAtTime(0.1, now, 0.05);
          gain.gain.setTargetAtTime(0, now + 2, 0.1);
          setTimeout(loopRinging, 6000);
        };
        loopRinging();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        return { osc, stop: () => { active = false; } };
      };

      const o1 = createOscillator(440);
      const o2 = createOscillator(480);
      oscillatorsRef.current = [o1.osc, o2.osc];
    } catch (e) {
      console.warn('Web Audio failed:', e);
    }
  }, []);

  const stopRinging = useCallback(() => {
    oscillatorsRef.current.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (_) {}
    });
    oscillatorsRef.current = [];
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (_) {}
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // Start ringing IMMEDIATELY — no async blocking before this
    startRinging();
    setStatus('starting');

    const startCall = async () => {
      try {
        // Teardown only delays if something was already running
        await stopGlobalVapi();
        if (!isMounted) return;

        const vapiInstance = new Vapi(apiKey);
        globalVapi = vapiInstance;

        vapiInstance.on('call-start', () => {
          if (!isMounted) return;
          setIsConnected(true);
          setStatus('active');
          stopRinging();
        });

        vapiInstance.on('call-end', () => {
          stopRinging();
          if (isMounted) {
            setIsConnected(false);
            setIsSpeaking(false);
            setStatus('idle');
          }
          globalVapi = null;
          onCloseRef.current();
        });

        vapiInstance.on('speech-start', () => { if (isMounted) setIsSpeaking(true); });
        vapiInstance.on('speech-end',   () => { if (isMounted) setIsSpeaking(false); });

        vapiInstance.on('error', (err) => {
          console.error('Vapi error:', err);
          stopRinging();
          if (isMounted) setStatus('error');
        });

        await vapiInstance.start(assistantId);
      } catch (err) {
        console.error('Vapi init failed:', err);
        stopRinging();
        if (isMounted) setStatus('error');
        onCloseRef.current();
      }
    };

    startCall();

    return () => {
      isMounted = false;
      stopRinging();
      stopGlobalVapi();
    };
  }, [isOpen, apiKey, assistantId]); // onClose intentionally excluded — using ref

  const endCall = async () => {
    setStatus('idle');
    stopRinging();
    await stopGlobalVapi();
    onClose();
  };

  const toggleMute = () => {
    if (globalVapi) {
      const next = !isMuted;
      globalVapi.setMuted(next);
      setIsMuted(next);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center animate-in fade-in slide-in-from-right-2 duration-300">
      <div className={`bg-slate-900 border ${status === 'error' ? 'border-red-500/50' : 'border-slate-700/50'} rounded-xl px-3 py-1 flex items-center space-x-2.5 shadow-lg`}>
        {status === 'starting' && (
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" title="Connecting..." />
        )}

        <button
          onClick={toggleMute}
          disabled={status !== 'active'}
          className={`p-1.5 rounded-lg transition-all duration-300 ${
            isMuted ? 'text-slate-500 bg-slate-800' : 'text-indigo-400 bg-slate-800/50 hover:text-white'
          } ${status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <MicrophoneIcon className={`w-4 h-4 ${!isMuted && isConnected ? 'animate-pulse' : ''}`} />
        </button>

        <div className="w-px h-5 bg-slate-700/50" />

        <div className={`transition-all duration-300 ${isSpeaking ? 'text-emerald-400 scale-110' : 'text-slate-500'}`}>
          <SpeakerWaveIcon className="w-4 h-4" />
        </div>

        <button
          onClick={endCall}
          className="bg-red-500/90 hover:bg-red-500 text-white p-1.5 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
        >
          <XMarkIcon className="w-4 h-4 stroke-[2.5px]" />
        </button>
      </div>
    </div>
  );
};

export default VapiCallWidget;