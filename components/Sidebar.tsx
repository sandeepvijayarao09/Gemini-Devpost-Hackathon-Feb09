
import React, { useState, useRef } from 'react';
import { AppMode, NodeType, CanvasNode, User, ChatSession, Collaborator, ProjectVersion } from '../types';
import mammoth from 'mammoth';
import { 
  FileText, 
  Link as LinkIcon, 
  Video, 
  Plus,
  Loader2,
  Users,
  X,
  ChevronLeft,
  Check,
  MessageSquare,
  Trash2,
  FolderOpen,
  Settings2,
  Search,
  Home,
  PlusSquare,
  UserPlus,
  Crown,
  Eye,
  Edit3,
  History,
  Save,
  RotateCcw,
  Sparkles,
  Cpu,
  StickyNote,
  Lightbulb,
  Palette
} from 'lucide-react';

export type SidebarTab = 'assets' | 'chats' | 'team' | 'history';

interface SidebarProps {
  mode: AppMode;
  onAddNode: (type: NodeType, content: string, title: string, url?: string, data?: string, mimeType?: string) => void;
  nodes: CanvasNode[];
  users: User[];
  collaborators?: Collaborator[];
  onInviteUser: (email: string) => void;
  onClose: () => void;
  isMobile: boolean;
  chatSessions: ChatSession[];
  currentChatId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onBackToDashboard?: () => void;
  onNewProject?: (title: string, description: string, mode: AppMode) => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  versions?: ProjectVersion[];
  onCreateVersion?: (name?: string) => void;
  onRestoreVersion?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  mode, 
  onAddNode,
  nodes,
  users,
  collaborators = [],
  onInviteUser,
  onClose,
  isMobile,
  chatSessions,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onBackToDashboard,
  onNewProject,
  activeTab,
  onTabChange,
  versions = [],
  onCreateVersion,
  onRestoreVersion,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Project Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectMode, setNewProjectMode] = useState<AppMode>(AppMode.RESEARCHER);

  // Input State for Link/Video
  const [activeInput, setActiveInput] = useState<'link' | 'video' | null>(null);
  const [inputValue, setInputValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  const isResearch = mode === AppMode.RESEARCHER;
  const activeColorClass = isResearch ? 'text-blue-400 bg-blue-500/10 border-blue-500/50' : 'text-orange-400 bg-orange-500/10 border-orange-500/50';

  const processFile = (file: File): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = file.name;
        const fileType = file.type;

        if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          onAddNode(NodeType.FILE, result.value, fileName);
          resolve();
        } 
        else if (fileType === 'application/pdf' || fileType.startsWith('video/') || fileType.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Data = result.split(',')[1];
            onAddNode(NodeType.FILE, "[Binary File Attached]", fileName, undefined, base64Data, fileType);
            resolve();
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        }
        else {
          const text = await file.text();
          onAddNode(NodeType.FILE, text, fileName);
          resolve();
        }
      } catch (error) {
        console.error("Error processing file:", file.name, error);
        resolve(); 
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
        await Promise.all((Array.from(files) as File[]).map(file => processFile(file)));
    } catch (error) {
        console.error("Batch upload error:", error);
    } finally {
        setIsUploading(false);
        e.target.value = '';
    }
  };

  const submitInvite = () => {
    if (inviteEmail && inviteEmail.includes('@')) {
      onInviteUser(inviteEmail);
      setInviteEmail('');
      setIsInviting(false);
    }
  };

  const handleSubmitInput = () => {
      if (!inputValue.trim()) return;
      if (activeInput === 'link') {
          onAddNode(NodeType.LINK, `Link: ${inputValue}`, "Web Link", inputValue);
      } else if (activeInput === 'video') {
          onAddNode(NodeType.VIDEO, `Video: ${inputValue}`, "YouTube Video", inputValue);
      }
      setInputValue('');
      setActiveInput(null);
  };

  const handleCreateVersionClick = () => {
      if (onCreateVersion) {
          const name = prompt("Name this version:", `Version ${versions.length + 1}`);
          if (name) onCreateVersion(name);
      }
  };

  const handleCreateProjectSubmit = () => {
      if (!newProjectTitle.trim()) return;
      if (onNewProject) {
          onNewProject(newProjectTitle, '', newProjectMode);
          setShowNewProjectModal(false);
          setNewProjectTitle('');
          setNewProjectMode(AppMode.RESEARCHER); // Reset default
      }
  };

  const filteredNodes = nodes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredChats = chatSessions.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // Helper to get role icon
  const getRoleIcon = (role?: string) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-yellow-500" />;
    if (role === 'viewer') return <Eye className="w-3 h-3 text-neural-500" />;
    return <Edit3 className="w-3 h-3 text-neural-400" />;
  };

  // --- RENDER HELPERS ---
  
  const renderTabButton = (id: SidebarTab, icon: React.ReactNode, label: string) => (
      <button 
        onClick={() => onTabChange(id)}
        className={`w-full p-3 flex flex-col items-center gap-1 transition-all border-l-2 ${activeTab === id ? `${isResearch ? 'border-blue-500 text-blue-400 bg-neural-800' : 'border-orange-500 text-orange-400 bg-neural-800'}` : 'border-transparent text-neural-500 hover:text-neural-300 hover:bg-neural-800/50'}`}
        title={label}
      >
          {icon}
          <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
      </button>
  );

  return (
    <div className="w-full h-full flex bg-neural-900 border-r border-neural-800 shadow-xl overflow-hidden relative">
      
      {/* 1. ACTIVITY BAR (Left Slim Column) */}
      <div className="w-16 flex flex-col bg-neural-950 border-r border-neural-800 z-10 shrink-0">
          
          {/* NAVIGATION BUTTONS */}
          <div className="p-3 mb-2 flex flex-col gap-3 justify-center border-b border-white/5 pb-4">
             <button 
                onClick={onBackToDashboard} 
                className="p-2 text-neural-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Back to Dashboard"
             >
                 <Home className="w-5 h-5" />
             </button>
             {onNewProject && (
                 <button 
                    onClick={() => setShowNewProjectModal(true)} 
                    className="p-2 text-neural-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    title="Create New Project"
                 >
                     <PlusSquare className="w-5 h-5" />
                 </button>
             )}
          </div>
          
          <div className="flex-1 flex flex-col gap-2 pt-2">
              {renderTabButton('assets', <FolderOpen className="w-5 h-5"/>, 'Assets')}
              {renderTabButton('chats', <MessageSquare className="w-5 h-5"/>, 'Chats')}
              {renderTabButton('team', <Users className="w-5 h-5"/>, 'Team')}
              {renderTabButton('history', <History className="w-5 h-5"/>, 'History')}
          </div>

          <div className="p-3 border-t border-neural-800">
             <button onClick={onClose} className="w-full p-2 text-neural-500 hover:text-white flex justify-center rounded hover:bg-neural-800 transition-colors">
                {isMobile ? <X className="w-5 h-5"/> : <ChevronLeft className="w-5 h-5"/>}
             </button>
          </div>
      </div>

      {/* 2. CONTENT PANEL (Expandable Area) */}
      <div className="flex-1 flex flex-col min-w-0 bg-neural-900">
          
          {/* Header */}
          <div className="h-14 border-b border-neural-800 flex items-center justify-between px-4 shrink-0">
             <h2 className="font-semibold text-neural-200 tracking-tight">
                {activeTab === 'assets' && 'Project Assets'}
                {activeTab === 'chats' && 'Conversations'}
                {activeTab === 'team' && 'Collaborators'}
                {activeTab === 'history' && 'Version History'}
             </h2>
             
             {/* Mode Indicator (READ ONLY) */}
             <div className="flex items-center gap-2">
                 {activeTab === 'team' && (
                     <button 
                        onClick={() => inviteInputRef.current?.focus()}
                        className="p-1.5 rounded hover:bg-neural-800 text-neural-400 hover:text-white transition-colors"
                        title="Add Member"
                     >
                         <UserPlus className="w-4 h-4" />
                     </button>
                 )}
                 <div 
                    className={`px-2 py-1 rounded transition-all flex items-center gap-2 text-[10px] font-bold uppercase border cursor-default select-none ${isResearch ? 'bg-blue-900/30 border-blue-500/30 text-blue-400' : 'bg-orange-900/30 border-orange-500/30 text-orange-400'}`}
                    title="Current Mode"
                 >
                     <Settings2 className="w-3 h-3" />
                     {isResearch ? 'RSRCH' : 'CREAT'}
                 </div>
             </div>
          </div>

          {/* Search Bar */}
          {(activeTab === 'assets' || activeTab === 'chats') && (
              <div className="p-3 pb-0">
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-neural-500" />
                      <input 
                        className="w-full bg-neural-950 border border-neural-700 rounded-lg pl-9 pr-3 py-2 text-sm text-neural-200 placeholder-neural-600 focus:outline-none focus:border-neural-500 transition-colors"
                        placeholder="Filter..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
          )}

          {/* TAB CONTENT: ASSETS */}
          {activeTab === 'assets' && (
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 space-y-2 shrink-0">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full py-2 bg-neural-800 hover:bg-neural-700 border border-neural-700 hover:border-neural-600 rounded-lg text-sm text-neural-200 flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
                        Upload Files
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileUpload} accept=".pdf,.docx,.doc,.txt,.md,.mp4,.png,.jpg,.jpeg" />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => { setActiveInput(activeInput === 'link' ? null : 'link'); setInputValue(''); }}
                            className={`py-2 rounded-lg text-xs flex items-center justify-center gap-1 border transition-all ${activeInput === 'link' ? 'bg-neural-700 border-neural-500 text-white' : 'bg-neural-800 border-neural-700 text-neural-400 hover:bg-neural-700'}`}
                        >
                            <LinkIcon className="w-3 h-3" /> Add Link
                        </button>
                        <button 
                            onClick={() => { setActiveInput(activeInput === 'video' ? null : 'video'); setInputValue(''); }}
                            className={`py-2 rounded-lg text-xs flex items-center justify-center gap-1 border transition-all ${activeInput === 'video' ? 'bg-neural-700 border-neural-500 text-white' : 'bg-neural-800 border-neural-700 text-neural-400 hover:bg-neural-700'}`}
                        >
                            <Video className="w-3 h-3" /> Add Video
                        </button>
                    </div>

                    {/* Inline Input for Link/Video */}
                    {activeInput && (
                        <div className="bg-neural-800 p-2 rounded-lg border border-neural-600 animate-in slide-in-from-top-2 fade-in">
                            <input 
                                autoFocus
                                className="w-full bg-neural-950 border border-neural-700 rounded px-2 py-1.5 text-xs text-white placeholder-neural-500 focus:border-neural-400 outline-none mb-2"
                                placeholder={activeInput === 'link' ? "https://example.com" : "https://youtube.com/watch?v=..."}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmitInput()}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setActiveInput(null)} className="text-[10px] text-neural-400 hover:text-white px-2 py-1">Cancel</button>
                                <button onClick={handleSubmitInput} disabled={!inputValue.trim()} className="bg-neural-100 hover:bg-white text-neural-900 text-[10px] font-bold px-3 py-1 rounded disabled:opacity-50">Add</button>
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                      <div className="flex items-center justify-between px-1 py-2">
                        <span className="text-[10px] font-bold uppercase text-neural-500">All Files</span>
                        <span className="text-[10px] bg-neural-800 px-1.5 py-0.5 rounded text-neural-400">{filteredNodes.length}</span>
                      </div>
                      
                      {filteredNodes.map(node => (
                          <div key={node.id} className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-neural-800 cursor-pointer transition-all border border-transparent hover:border-neural-700">
                              <div className="p-2 bg-neural-950 rounded border border-neural-800 text-neural-400">
                                  {node.type === NodeType.FILE ? <FileText className="w-4 h-4" /> : 
                                   node.type === NodeType.VIDEO ? <Video className="w-4 h-4" /> : 
                                   <LinkIcon className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-sm text-neural-200 truncate font-medium">{node.title}</p>
                                  <p className="text-[10px] text-neural-500 truncate capitalize">{node.type.toLowerCase()}</p>
                              </div>
                          </div>
                      ))}
                      {filteredNodes.length === 0 && (
                          <div className="mt-8 text-center px-4">
                              <p className="text-xs text-neural-500">No assets found. Upload files or add links to populate your canvas.</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* TAB CONTENT: CHATS */}
          {activeTab === 'chats' && (
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 shrink-0">
                      <button 
                        onClick={onNewChat}
                        className={`w-full py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition-all ${activeColorClass}`}
                      >
                          <Plus className="w-4 h-4" /> New Chat
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                      {filteredChats.map(session => (
                        <div 
                            key={session.id}
                            onClick={() => onSelectChat(session.id)} 
                            className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                                currentChatId === session.id 
                                    ? `bg-neural-800 border-neural-700 text-white shadow-sm ring-1 ring-white/5` 
                                    : 'hover:bg-neural-800/50 border-transparent text-neural-400'
                            }`}
                        >
                            <MessageSquare className={`w-4 h-4 shrink-0 ${currentChatId === session.id ? (isResearch ? 'text-blue-400' : 'text-orange-400') : 'text-neural-600'}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{session.title}</p>
                                <p className="text-[10px] text-neural-500 truncate">
                                    {new Date(session.timestamp).toLocaleDateString()} • {session.messages.length} msgs
                                </p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 text-neural-500 hover:text-red-400 rounded transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                      ))}
                  </div>
              </div>
          )}

          {/* TAB CONTENT: TEAM */}
          {activeTab === 'team' && (
              <div className="flex-1 flex flex-col min-h-0 p-3">
                  <div className="mb-4">
                      <h3 className="text-xs font-bold uppercase text-neural-500 mb-2">Invite Member</h3>
                      <div className="flex gap-2 items-center">
                        <input 
                            ref={inviteInputRef}
                            className="flex-1 bg-neural-950 border border-neural-700 rounded text-xs px-3 py-2 text-white focus:border-neural-500 outline-none transition-colors focus:ring-1 focus:ring-neural-500 min-w-0"
                            placeholder="colleague@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitInvite()}
                        />
                        <button onClick={submitInvite} className="bg-neural-800 hover:bg-neural-700 border border-neural-700 text-neural-200 p-2 rounded shrink-0">
                            <Plus className="w-4 h-4" />
                        </button>
                      </div>
                  </div>

                  <h3 className="text-xs font-bold uppercase text-neural-500 mb-2">Active Members</h3>
                  <div className="space-y-2">
                      {users.map(user => {
                          const role = collaborators.find(c => c.userId === user.id)?.role || 'editor';
                          
                          return (
                          <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-neural-800/50 border border-neural-800">
                              <div className="relative">
                                  <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt={user.name} />
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-neural-800 rounded-full"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                     <p className="text-sm font-medium text-neural-200 truncate">{user.name}</p>
                                     <span className="opacity-60 shrink-0">{getRoleIcon(role)}</span>
                                  </div>
                                  <p className="text-[10px] text-neural-500 capitalize">{role}</p>
                              </div>
                          </div>
                      )})}
                  </div>
              </div>
          )}

          {/* TAB CONTENT: HISTORY (VERSION CONTROL) */}
          {activeTab === 'history' && (
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 shrink-0">
                      <button 
                        onClick={handleCreateVersionClick}
                        className={`w-full py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 transition-all ${activeColorClass}`}
                      >
                          <Save className="w-4 h-4" /> Create Version
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
                      {versions.length === 0 && (
                          <div className="mt-8 text-center px-4">
                              <p className="text-xs text-neural-500">No history versions saved yet. Create a snapshot to safeguard your progress.</p>
                          </div>
                      )}

                      {versions.map(version => (
                        <div 
                            key={version.id}
                            className="group flex flex-col gap-2 p-3 rounded-lg border border-transparent hover:bg-neural-800/50 hover:border-neural-700 transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-white">{version.name}</p>
                                    <p className="text-[10px] text-neural-500">
                                        {new Date(version.timestamp).toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-neural-500 mt-0.5">
                                        by {version.createdBy} • {version.nodes.length} items
                                    </p>
                                </div>
                                {onRestoreVersion && (
                                    <button 
                                        onClick={() => onRestoreVersion(version.id)}
                                        className="p-1.5 bg-neural-800 text-neural-400 hover:text-white hover:bg-blue-600 rounded transition-colors"
                                        title="Restore this version"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      {/* NEW PROJECT MODAL OVERLAY */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-neural-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
                <button 
                    onClick={() => setShowNewProjectModal(false)}
                    className="absolute top-4 right-4 text-neural-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-bold text-white mb-6">Create New Project</h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-neural-400 uppercase tracking-wider block mb-2">Project Title</label>
                        <input 
                            className="w-full bg-neural-950 border border-neural-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                            value={newProjectTitle}
                            onChange={e => setNewProjectTitle(e.target.value)}
                            placeholder="e.g. Q3 Market Analysis"
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-neural-400 uppercase tracking-wider block mb-2">Select Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setNewProjectMode(AppMode.RESEARCHER)}
                                className={`p-4 rounded-xl border text-sm font-bold flex flex-col items-center gap-3 transition-all ${newProjectMode === AppMode.RESEARCHER ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-neural-950 border-neural-800 text-neural-500 hover:bg-neural-800 hover:border-neural-700'}`}
                            >
                                <Cpu className="w-6 h-6" />
                                Researcher
                            </button>
                            <button
                                onClick={() => setNewProjectMode(AppMode.CREATOR)}
                                className={`p-4 rounded-xl border text-sm font-bold flex flex-col items-center gap-3 transition-all ${newProjectMode === AppMode.CREATOR ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'bg-neural-950 border-neural-800 text-neural-500 hover:bg-neural-800 hover:border-neural-700'}`}
                            >
                                <Sparkles className="w-6 h-6" />
                                Creator
                            </button>
                        </div>
                        <p className="text-[10px] text-neural-500 mt-2 text-center">
                            {newProjectMode === AppMode.RESEARCHER ? 'Tools for deep analysis, web grounding, and citation.' : 'Tools for ideation, scripting, and multi-channel distribution.'}
                        </p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button 
                            disabled={!newProjectTitle.trim()}
                            onClick={handleCreateProjectSubmit} 
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/50 transition-all"
                        >
                            Start Project
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
