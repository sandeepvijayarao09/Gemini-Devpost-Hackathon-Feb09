
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Users, ChevronRight } from 'lucide-react';
import { TeamMessage, User } from '../types';

interface TeamChatWidgetProps {
  messages: TeamMessage[];
  onSendMessage: (text: string) => void;
  currentUser: User;
  users: User[];
  onViewSession?: (sessionId: string) => void;
}

export const TeamChatWidget: React.FC<TeamChatWidgetProps> = ({ 
  messages, 
  onSendMessage, 
  currentUser, 
  users,
  onViewSession 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(Date.now());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when opening or new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Mark as read
      setUnreadCount(0);
      if (messages.length > 0) {
          setLastReadTimestamp(Date.now());
      }
    } else {
        // If closed, check if there are new messages since last read
        const newMessages = messages.filter(m => m.timestamp > lastReadTimestamp && m.userId !== currentUser.id);
        setUnreadCount(newMessages.length);
    }
  }, [messages, isOpen, lastReadTimestamp, currentUser.id]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const getUser = (id: string) => users.find(u => u.id === id) || { name: 'Unknown', avatarUrl: '', color: '#888' };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <div 
        className={`
          mb-4 w-[350px] bg-neural-900 border border-neural-700 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100 h-[500px]' : 'opacity-0 scale-90 h-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="p-4 bg-neural-800 border-b border-neural-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Team Chat</h3>
              <p className="text-[10px] text-neural-400 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                {users.length} members online
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-neural-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neural-950/50 scrollbar-thin scrollbar-thumb-neural-700">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-neural-500 gap-2">
              <MessageSquare className="w-8 h-8 opacity-20" />
              <p className="text-xs">No messages yet. Say hello!</p>
            </div>
          )}
          
          {messages.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            const sender = getUser(msg.userId);

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                   <div 
                     className="w-8 h-8 rounded-full bg-neural-800 border border-neural-700 flex-shrink-0 overflow-hidden"
                     title={sender.name}
                   >
                     {sender.avatarUrl ? <img src={sender.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px]">{sender.name[0]}</div>}
                   </div>
                )}
                
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] text-neural-500 ml-1 mb-0.5">{sender.name}</span>}
                  
                  {/* Message Bubble */}
                  <div className={`
                    px-3 py-2 rounded-2xl text-sm shadow-sm
                    ${isMe 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-neural-800 text-neural-200 border border-neural-700 rounded-bl-none'}
                  `}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Shared Session Attachment */}
                  {msg.attachment && msg.attachment.type === 'session_share' && (
                    <div 
                      onClick={() => onViewSession && onViewSession(msg.attachment!.sessionId)}
                      className={`
                        mt-2 p-3 rounded-xl border cursor-pointer hover:border-indigo-500 transition-all group w-full
                        ${isMe ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-neural-800 border-neural-700'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">AI Session Shared</span>
                      </div>
                      <p className="text-xs font-bold text-white mb-1">{msg.attachment.title}</p>
                      <p className="text-[10px] text-neural-400 line-clamp-2 italic">"{msg.attachment.preview}"</p>
                      <div className="mt-2 text-[10px] font-bold text-indigo-400 flex items-center gap-1 group-hover:underline">
                        View Chat <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  )}

                  <span className="text-[9px] text-neural-600 mt-1 mx-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-neural-900 border-t border-neural-800 flex gap-2 shrink-0">
          <input
            className="flex-1 bg-neural-950 border border-neural-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-neural-600"
            placeholder="Message team..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center aspect-square"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 relative
          ${isOpen ? 'bg-neural-800 text-white rotate-90' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'}
        `}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-neural-900 animate-bounce">
              {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
