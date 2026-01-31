
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFFile } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';

interface VoiceInterfaceProps {
  pdf: PDFFile;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ pdf }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{user: string, ai: string}[]>([]);
  const [displayInput, setDisplayInput] = useState('');
  const [displayOutput, setDisplayOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Refs to avoid stale closures in the onmessage callback
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startSession = async () => {
    // Check if key is selected (mandatory for high-tier models like native audio in some environments)
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
      // Proceeding assuming selection was successful per race condition guidelines
    }

    setIsConnecting(true);
    setError(null);
    currentInputRef.current = '';
    currentOutputRef.current = '';
    setDisplayInput('');
    setDisplayOutput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!audioContextInRef.current) audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!audioContextOutRef.current) audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are a conversational AI assistant named DocuVoice. You are helping a user explore a PDF document titled "${pdf.name}". Use the provided document summary to ground your knowledge. Be friendly, spoken-word optimized, and concise. SUMMARY: ${pdf.summary || 'Not provided'}`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);

            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputRef.current += message.serverContent.outputTranscription.text;
              setDisplayOutput(currentOutputRef.current);
            } else if (message.serverContent?.inputTranscription) {
              currentInputRef.current += message.serverContent.inputTranscription.text;
              setDisplayInput(currentInputRef.current);
            }

            if (message.serverContent?.turnComplete) {
              const finishedInput = currentInputRef.current;
              const finishedOutput = currentOutputRef.current;
              setTranscriptions(prev => [...prev, { 
                user: finishedInput, 
                ai: finishedOutput 
              }]);
              currentInputRef.current = '';
              currentOutputRef.current = '';
              setDisplayInput('');
              setDisplayOutput('');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );

              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(ctx.destination);
              sourceNode.addEventListener('ended', () => {
                sourcesRef.current.delete(sourceNode);
              });

              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(sourceNode);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Live error:', e);
            let errorMsg = "The connection encountered a network error.";
            if (e instanceof ErrorEvent && e.message.includes("entity was not found")) {
              errorMsg = "API Key error. Please re-select a paid project key.";
              window.aistudio?.openSelectKey();
            }
            setError(errorMsg);
            stopSession();
          },
          onclose: (e) => {
            console.log('Live session closed', e);
            stopSession();
          },
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      if (err?.message?.includes("entity was not found")) {
        setError("Invalid API Project. Please select a key from a paid GCP project.");
        window.aistudio?.openSelectKey();
      } else {
        setError("Network error: Could not connect to Gemini Live service.");
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-blue-500/10 rounded-full animate-ping"></div>
            <div className="absolute w-48 h-48 bg-blue-500/20 rounded-full animate-ping [animation-delay:0.5s]"></div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <div className={`
            w-32 h-32 rounded-full flex items-center justify-center mb-8
            transition-all duration-500
            ${isActive ? 'bg-blue-600 scale-110 shadow-[0_0_50px_rgba(37,99,235,0.4)]' : 'bg-slate-800 scale-100'}
          `}>
            {isConnecting ? (
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : isActive ? (
              <div className="flex items-center gap-1.5 h-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-white rounded-full voice-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.15}s` }}></div>
                ))}
              </div>
            ) : (
              <svg className="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-3">
            {isConnecting ? 'Establishing connection...' : isActive ? 'Connected' : 'Live Document Voice'}
          </h2>
          <p className="text-slate-400 mb-8 px-4">
            {isActive 
              ? "Talking to " + pdf.name + ". Ask anything about the document contents."
              : "Engage in a real-time voice conversation about your file. Uses Gemini 2.5 Flash for low-latency audio."}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl max-w-sm">
              {error}
              {error.includes("Network error") && (
                <p className="mt-2 text-xs opacity-70">Check your internet connection or API project quota.</p>
              )}
            </div>
          )}

          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`
              px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center gap-3
              ${isActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-900/40'}
            `}
          >
            {isActive ? (
              <>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                Stop Conversation
              </>
            ) : (
              'Start Voice Session'
            )}
          </button>
        </div>

        {(displayInput || displayOutput || transcriptions.length > 0) && (
          <div className="absolute bottom-8 left-8 right-8 max-h-48 overflow-y-auto bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col gap-3">
            {transcriptions.slice(-2).map((t, i) => (
              <div key={i} className="text-sm opacity-50 space-y-1">
                <p><span className="text-blue-400 font-bold">You:</span> {t.user}</p>
                <p><span className="text-purple-400 font-bold">AI:</span> {t.ai}</p>
              </div>
            ))}
            {(displayInput || displayOutput) && (
              <div className="text-sm space-y-1">
                {displayInput && <p><span className="text-blue-400 font-bold">You:</span> {displayInput}</p>}
                {displayOutput && <p><span className="text-purple-400 font-bold">AI:</span> {displayOutput}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceInterface;
