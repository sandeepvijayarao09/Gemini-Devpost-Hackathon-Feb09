
import React, { useEffect, useRef, useState, memo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, MicOff, PhoneOff, FileText, Loader2, Save } from 'lucide-react';
import { AppMode } from '../types';
import { summarizeLiveSession } from '../services/geminiService';

interface LiveSessionOverlayProps {
  mode: AppMode;
  onClose: (data?: { transcript: string, summary: string }) => void;
}

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// --- Audio Helpers (PCM 16kHz Input / 24kHz Output) ---
const createBlob = (data: Float32Array): { data: string, mimeType: string } => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
};

const decodeAudioData = async (
  base64: string,
  ctx: AudioContext
): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const sampleRate = 24000;
  const numChannels = 1;
  const frameCount = dataInt16.length;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = memo(({ mode, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'summarizing'>('connecting');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // For visualizer
  const [transcript, setTranscript] = useState<{role: 'user' | 'model', text: string}[]>([]);

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Refs
  const currentSessionRef = useRef<any>(null);
  
  // Transcription Buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const isResearcher = mode === AppMode.RESEARCHER;
  const themeColor = isResearcher ? 'bg-blue-500' : 'bg-orange-500';
  const glowColor = isResearcher ? 'shadow-blue-500/50' : 'shadow-orange-500/50';

  useEffect(() => {
    let isMounted = true;
    let visualizerInterval: any;

    const startSession = async () => {
      try {
        const apiKey = process.env.API_KEY || '';
        if (!apiKey) {
            console.error("API Key missing");
            setStatus('error');
            return;
        }

        const ai = new GoogleGenAI({ apiKey });

        // 1. Setup Audio Contexts
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputContextRef.current = inputCtx;
        outputContextRef.current = outputCtx;

        // 2. Setup Microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // 3. Define System Instruction based on Persona
        const instruction = isResearcher
          ? "You are a Senior Research Partner. You are analytical, critical, and rigorous. Do not just answer questions; discuss them. Ask clarifying questions. Challenge assumptions. Keep responses concise and conversational."
          : "You are a Creative Co-Founder. You are enthusiastic, divergent, and imaginative. Use a 'Yes, and...' approach. Build upon ideas wildly. Keep responses energetic and conversational.";

        const voiceName = isResearcher ? 'Kore' : 'Fenrir';

        // 4. Connect to Gemini Live
        const sessionPromise = ai.live.connect({
            model: MODEL_NAME,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                },
                systemInstruction: instruction,
                inputAudioTranscription: {}, // Enable Input Transcription
                outputAudioTranscription: {} // Enable Output Transcription
            },
            callbacks: {
                onopen: () => {
                   if (isMounted) setStatus('connected');
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle Transcription
                    if (msg.serverContent?.outputTranscription) {
                        currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
                    } else if (msg.serverContent?.inputTranscription) {
                        currentInputTranscription.current += msg.serverContent.inputTranscription.text;
                    }

                    if (msg.serverContent?.turnComplete) {
                         const userText = currentInputTranscription.current;
                         const modelText = currentOutputTranscription.current;
                         
                         if (userText.trim()) {
                             setTranscript(prev => [...prev, { role: 'user', text: userText }]);
                         }
                         if (modelText.trim()) {
                             setTranscript(prev => [...prev, { role: 'model', text: modelText }]);
                         }

                         currentInputTranscription.current = '';
                         currentOutputTranscription.current = '';
                    }

                    // Handle Audio Output
                    const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputCtx) {
                        const buffer = await decodeAudioData(base64Audio, outputCtx);
                        
                        // Schedule Playback
                        const source = outputCtx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(outputCtx.destination);
                        
                        const currentTime = outputCtx.currentTime;
                        const startTime = Math.max(nextStartTimeRef.current, currentTime);
                        source.start(startTime);
                        
                        nextStartTimeRef.current = startTime + buffer.duration;
                        
                        activeSourcesRef.current.add(source);
                        source.onended = () => {
                            activeSourcesRef.current.delete(source);
                        };

                        // Visualizer: Simulate speaking activity
                        setVolumeLevel(prev => Math.min(prev + 0.3, 1.2)); 
                        setTimeout(() => setVolumeLevel(prev => Math.max(prev - 0.3, 0)), buffer.duration * 1000);
                    }

                    // Handle Interruption
                    if (msg.serverContent?.interrupted) {
                        activeSourcesRef.current.forEach(s => {
                            try { s.stop(); } catch(e) {}
                        });
                        activeSourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                        setVolumeLevel(0);
                    }
                },
                onclose: () => {
                    console.log('Live session closed');
                },
                onerror: (err) => {
                    console.error('Live session error', err);
                    if (isMounted) setStatus('error');
                }
            }
        });

        sessionPromise.then(session => {
            currentSessionRef.current = session;
        });

        // 5. Start Audio Streaming (Input)
        processor.onaudioprocess = (e) => {
            if (isMicMuted) return; // Simple mute
            
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate volume for visualizer
            let sum = 0;
            for(let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            
            // Smooth Visualizer
            if (rms > 0.01) {
                setVolumeLevel(prev => prev * 0.8 + (rms * 5) * 0.2);
            } else {
                setVolumeLevel(prev => prev * 0.9);
            }

            const pcmBlob = createBlob(inputData);
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);

      } catch (e) {
        console.error("Failed to start live session", e);
        if (isMounted) setStatus('error');
      }
    };

    startSession();

    return () => {
        isMounted = false;
        clearInterval(visualizerInterval);
        
        // Cleanup Session Explicitly
        if (currentSessionRef.current) {
            try {
                currentSessionRef.current.close();
            } catch(e) {
                console.warn("Error closing session", e);
            }
        }

        // Cleanup Audio
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
        }
        if (inputContextRef.current) inputContextRef.current.close();
        if (outputContextRef.current) outputContextRef.current.close();
    };
  }, [isResearcher]); // Re-run if mode changes

  // Toggle Mic
  const toggleMic = () => {
      setIsMicMuted(!isMicMuted);
  };

  const handleEndAndSave = async () => {
      setStatus('summarizing');
      
      // Cleanup Audio Immediately
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (currentSessionRef.current) currentSessionRef.current.close();

      const rawTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
      
      if (!rawTranscript.trim()) {
          onClose(); // No content to save
          return;
      }

      const summary = await summarizeLiveSession(rawTranscript);
      onClose({ transcript: rawTranscript, summary });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
        
        {/* Top Controls */}
        <div className="absolute top-6 right-6">
            <button onClick={() => onClose()} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Center Visualizer */}
        <div className="flex flex-col items-center gap-8 relative">
            <div className={`
                relative flex items-center justify-center
                w-48 h-48 rounded-full 
                ${status === 'connected' ? themeColor : 'bg-gray-600'}
                transition-all duration-150 ease-out
                shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]
                ${status === 'connected' ? glowColor : ''}
            `}
            style={{
                transform: `scale(${1 + Math.min(volumeLevel, 0.5)})`, // Clamped breathe effect
            }}
            >
                {/* Core Orb */}
                <div className="absolute inset-2 rounded-full border-2 border-white/20 animate-pulse"></div>
                <div className="absolute inset-8 rounded-full bg-white/10 blur-xl"></div>
                
                {status === 'connecting' && <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full"></div>}
                {status === 'summarizing' && <Loader2 className="w-12 h-12 text-white animate-spin" />}
            </div>

            {/* Status Text */}
            <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    {isResearcher ? 'Research Partner' : 'Creative Co-Pilot'}
                </h2>
                <p className="text-white/50 text-sm font-mono uppercase tracking-widest">
                    {status === 'connecting' ? 'ESTABLISHING NEURAL LINK...' : 
                     status === 'error' ? 'CONNECTION FAILED' : 
                     status === 'summarizing' ? 'GENERATING SUMMARY...' : 
                     'NEURAL LINK ACTIVE'}
                </p>
                {status === 'connected' && transcript.length > 0 && (
                    <div className="mt-4 px-4 py-1 bg-white/10 rounded-full text-xs text-white/70">
                         <FileText className="w-3 h-3 inline mr-1" />
                         Transcribing... ({transcript.length} turns)
                    </div>
                )}
            </div>
        </div>

        {/* Bottom Controls */}
        {status !== 'summarizing' && (
            <div className="absolute bottom-12 flex items-center gap-6">
                <button 
                    onClick={toggleMic}
                    className={`p-6 rounded-full transition-all ${isMicMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isMicMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>

                <button 
                    onClick={handleEndAndSave}
                    className={`p-6 rounded-full text-white shadow-lg transition-all hover:scale-105 flex flex-col items-center gap-1 ${isResearcher ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/50'}`}
                    title="End & Save to Canvas"
                >
                    <Save className="w-8 h-8" />
                </button>

                <button 
                    onClick={() => onClose()}
                    className="p-6 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/50 hover:scale-105 transition-all"
                    title="End Call"
                >
                    <PhoneOff className="w-8 h-8" />
                </button>
            </div>
        )}
    </div>
  );
});
