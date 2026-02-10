
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Sparkles, Minimize2, Cpu, Paperclip, 
  Mic, Square, ScanSearch, Pin, 
  Activity, Zap, Terminal, Command, X, Loader2,
  Users
} from 'lucide-react';
import { Button } from './Button';
import { AppMode, User, ChatMessage } from '../types';
import { LiveSessionOverlay } from './LiveSessionOverlay';

interface ChatOverlayProps {
  onSendMessage: (message: string, attachments?: File[], isDeepResearch?: boolean) => Promise<string>;
  history: ChatMessage[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  mode: AppMode;
  hasSelection?: boolean;
  onSaveToCanvas?: (content: string) => void;
  suggestions?: string[];
  users: User[];
  currentUser: User;
  onShareToTeam?: () => void;
  sessionId?: string; // Added to track session switches
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
    onSendMessage, 
    history,
    selectedModel,
    onModelChange,
    mode,
    hasSelection = false,
    onSaveToCanvas,
    suggestions = [],
    users,
    currentUser,
    onShareToTeam,
    sessionId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Deep Research State
  const [isDeepResearch, setIsDeepResearch] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Auto-open when session changes
  useEffect(() => {
    if (sessionId && history.length > 0) {
        // If the session ID changed and there is history, open the window to show context
        // This handles the "View Session" click from TeamChat
        setIsOpen(true);
    }
  }, [sessionId]);

  // Determine Styles based on Mode
  const isResearch = mode === AppMode.RESEARCHER;
  
  const styles = isResearch ? {
      container: "bg-slate-950/95 border-slate-700/80 shadow-[0_0_50px_-10px_rgba(15,23,42,0.8)] backdrop-blur-xl rounded-lg",
      inputBar: "bg-slate-900/50 border-slate-700 text-slate-100 font-mono",
      accent: "text-cyan-400",
      accentBg: "bg-cyan-500/20 border-cyan-500/30 text-cyan-300",
      button: "hover:bg-cyan-900/30 text-slate-400 hover:text-cyan-300",
      aiBubble: "bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs rounded-sm border-l-2 border-l-cyan-500",
      myBubble: "bg-cyan-900/40 border border-cyan-800 text-cyan-50 font-mono text-xs rounded-sm",
      remoteBubble: "bg-slate-800 border border-slate-600 text-slate-200 font-mono text-xs rounded-sm",
      suggestion: "bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 font-mono text-[10px]",
      font: "font-mono"
  } : {
      container: "bg-stone-900/95 border-stone-700/50 shadow-[0_10px_50px_-10px_rgba(28,25,23,0.8)] backdrop-blur-xl rounded-3xl",
      inputBar: "bg-stone-800/50 border-stone-600/50 text-stone-100 font-sans",
      accent: "text-orange-400",
      accentBg: "bg-orange-500/20 border-orange-500/30 text-orange-200",
      button: "hover:bg-stone-700/50 text-stone-400 hover:text-orange-200",
      aiBubble: "bg-stone-800/80 border border-transparent text-stone-200 font-sans text-sm rounded-2xl rounded-tl-sm",
      myBubble: "bg-orange-600/90 text-white font-sans text-sm rounded-2xl rounded-br-sm shadow-sm",
      remoteBubble: "bg-stone-700/80 text-stone-100 font-sans text-sm rounded-2xl rounded-bl-sm",
      suggestion: "bg-stone-800/80 border-transparent text-stone-300 hover:bg-stone-700 hover:text-orange-200 font-sans text-xs rounded-full",
      font: "font-sans"
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [history, isOpen]);

  const handleSubmit = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;
    
    setIsOpen(true);
    const currentAttachments = [...attachments];
    const deepMode = isDeepResearch;
    
    setInput('');
    setAttachments([]);
    setIsLoading(true);
    
    await onSendMessage(textToSend, currentAttachments, deepMode);
    setIsLoading(false);
  };

  // --- Helpers for Message Rendering ---
  const getUserDetails = (userId?: string) => {
      if (!userId) return null;
      return users.find(u => u.id === userId);
  };

  // --- Voice Logic (Condensed) ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
             const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
             const audioFile = new File([audioBlob], `Voice_Note_${Date.now()}.webm`, { type: 'audio/webm' });
             setIsOpen(true);
             setIsLoading(true);
             await onSendMessage("Transcribe and Analyze this voice note.", [audioFile], isDeepResearch);
             setIsLoading(false);
             stream.getTracks().forEach(track => track.stop());
        };
        recorder.start();
        setIsRecording(true);
    } catch (err) { console.error(err); alert("Microphone access denied."); }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const placeholderText = isRecording ? "Listening..." : hasSelection ? "Ask about selection..." : isDeepResearch ? "Deep Research Query..." : "Command Neural Studio...";

  return (
    <>
    {isLiveMode && <LiveSessionOverlay mode={mode} onClose={() => setIsLiveMode(false)} />}

    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[95%] md:w-[700px] flex flex-col items-center transition-all duration-500 ease-out`}>
      
      {/* 1. HOLOGRAPHIC HISTORY (Supports Multi-User) */}
      <div className={`
          w-full mb-4 flex flex-col justify-end overflow-hidden transition-all duration-500 origin-bottom
          ${isOpen ? 'h-[60vh] opacity-100 scale-100' : 'h-0 opacity-0 scale-95 pointer-events-none'}
          ${styles.container} border
      `}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isResearch ? 'border-slate-800' : 'border-stone-800'}`}>
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${styles.accent}`}>
                  {isResearch ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {isResearch ? "RESEARCH_LOG" : "CREATIVE FLOW"}
              </div>
              <div className="flex items-center gap-2">
                 {onShareToTeam && (
                     <button onClick={onShareToTeam} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${styles.button} border border-transparent hover:border-white/10`}>
                         <Users className="w-3 h-3" /> Share to Team
                     </button>
                 )}
                 <button onClick={() => setIsOpen(false)} className={`p-1 rounded ${styles.button}`}>
                     <Minimize2 className="w-4 h-4" />
                 </button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-700">
             {history.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3">
                     <Command className="w-12 h-12" />
                     <p className={`text-sm ${styles.font}`}>System Ready. Awaiting Input.</p>
                 </div>
             )}
             
             {history.map((msg, i) => {
                 const isMe = msg.userId === currentUser.id;
                 const isAI = msg.role === 'ai';
                 const sender = isAI ? { name: 'Neural AI', avatarUrl: null } : getUserDetails(msg.userId);

                 return (
                    <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                        
                        {/* Remote User / AI Header */}
                        {!isMe && (
                            <div className="flex items-center gap-2 mb-1 pl-1">
                                {isAI ? (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${isResearch ? 'bg-cyan-900/50' : 'bg-orange-900/50'}`}>
                                        <Cpu className={`w-3 h-3 ${styles.accent}`} />
                                    </div>
                                ) : (
                                    <img src={sender?.avatarUrl || ''} className="w-5 h-5 rounded-full ring-1 ring-white/10" alt="" />
                                )}
                                <span className={`text-[10px] font-bold opacity-60 uppercase ${styles.font}`}>
                                    {isAI ? 'Gemini 3.0' : sender?.name || 'Unknown'}
                                </span>
                                <span className="text-[9px] opacity-30">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        )}

                        {/* Bubble */}
                        <div 
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/neural-node', JSON.stringify({
                                    type: 'TEXT',
                                    content: msg.content,
                                    title: isAI ? 'AI Insight' : 'User Note'
                                }));
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                            className={`
                                relative max-w-[85%] px-4 py-3 shadow-sm group cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-transform
                                ${isMe ? styles.myBubble : isAI ? styles.aiBubble : styles.remoteBubble}
                            `}
                        >
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                            
                            {/* Actions */}
                            {isAI && onSaveToCanvas && (
                                <button 
                                    onClick={() => onSaveToCanvas(msg.content)}
                                    className="absolute -right-8 top-0 p-1.5 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                    title="Pin to Canvas"
                                >
                                    <Pin className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* My User Footer */}
                        {isMe && (
                             <span className="text-[9px] opacity-30 mt-1 pr-1">
                                 {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                        )}
                    </div>
                 );
             })}

             {isLoading && (
                 <div className="flex justify-start">
                     <div className={`${styles.aiBubble} px-4 py-2 flex items-center gap-2`}>
                         <Loader2 className={`w-3 h-3 animate-spin ${styles.accent}`} />
                         <span className="text-[10px] uppercase tracking-wider animate-pulse">Processing...</span>
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>
      </div>

      {/* 2. SUGGESTION CHIPS */}
      {!isLoading && suggestions.length > 0 && (
         <div className="flex gap-2 mb-3 w-full justify-center overflow-x-auto no-scrollbar px-4">
             {suggestions.map((s, i) => (
                 <button 
                    key={i} 
                    onClick={() => handleSubmit(s)}
                    className={`px-3 py-1 border transition-all shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-500 delay-${i*100} ${styles.suggestion}`}
                 >
                     {s}
                 </button>
             ))}
         </div>
      )}

      {/* 3. INPUT COMMAND DECK */}
      <div className={`
          relative w-full p-2 flex items-center gap-2
          ${styles.container} border
          ring-1 ring-white/5 transition-all duration-300
          ${isRecording ? 'border-red-500/50 shadow-red-900/40' : (isDeepResearch && isResearch) ? 'border-cyan-500/50 shadow-cyan-900/40' : ''}
      `}>
          <div className="flex items-center gap-1 pl-2">
              {attachments.length > 0 ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs text-white">
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-[80px] truncate">{attachments[0].name}</span>
                      <button onClick={() => setAttachments([])}><X className="w-3 h-3 hover:text-red-400"/></button>
                  </div>
              ) : (
                  <div className={`p-2 rounded-md ${isResearch ? 'bg-slate-800' : 'bg-stone-800'}`}>
                      <img src={currentUser.avatarUrl} className="w-4 h-4 rounded-full" alt="Me" />
                  </div>
              )}
          </div>

          <input 
              ref={inputRef}
              className={`flex-1 bg-transparent border-none focus:ring-0 text-sm h-10 px-2 min-w-0 ${styles.inputBar} bg-transparent border-transparent`}
              placeholder={placeholderText}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              onClick={() => { if(history.length > 0) setIsOpen(true); }}
              disabled={isRecording}
          />

          <div className="flex items-center gap-1 pr-1">
              {isResearch && (
                 <button onClick={() => setIsDeepResearch(!isDeepResearch)} className={`p-2 rounded-md transition-all ${isDeepResearch ? styles.accentBg : styles.button}`}>
                     <ScanSearch className="w-4 h-4" />
                 </button>
              )}
              <div className="relative group">
                  <select value={selectedModel} onChange={(e) => onModelChange(e.target.value)} className={`w-6 h-8 opacity-0 absolute inset-0 cursor-pointer`} />
                  <div className={`p-2 rounded-md ${styles.button}`}><Zap className="w-4 h-4" /></div>
              </div>
              <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
              <button onClick={() => setIsLiveMode(true)} className={`p-2 rounded-md hover:bg-white/10 transition-all ${styles.button}`}><Activity className="w-4 h-4" /></button>
              <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded-md transition-all ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : styles.button}`}>
                  {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
              </button>
              <Button onClick={() => handleSubmit()} disabled={(!input.trim() && attachments.length === 0) || isLoading} className={`ml-1 rounded-md w-9 h-9 p-0 flex items-center justify-center ${(isDeepResearch && isResearch) ? 'bg-cyan-600 hover:bg-cyan-500' : ''}`}>
                  <Send className="w-4 h-4" />
              </Button>
          </div>
      </div>
    </div>
    </>
  );
};
