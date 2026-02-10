
import React, { useState } from 'react';
import { Project, AppMode } from '../types';
import { Plus, Clock, FileText, Layout, MoreVertical, Trash2, FolderOpen, Search, Cpu, Sparkles, ArrowRight } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onCreateProject: (title: string, description: string, mode: AppMode) => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  currentUser: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, onCreateProject, onOpenProject, onDeleteProject, currentUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMode, setNewMode] = useState<AppMode>(AppMode.RESEARCHER);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreateProject(newTitle, newDesc, newMode);
    setIsCreating(false);
    setNewTitle('');
    setNewDesc('');
  };

  const getRelativeTime = (timestamp: number) => {
      const diff = Date.now() - timestamp;
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full h-screen bg-neural-950 flex flex-col text-neural-100 overflow-hidden font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neural-900 via-neural-950 to-black">
        
        {/* Navbar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-neural-900/50 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Layout className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neural-500 leading-none mb-0.5">Neural Studio</span>
                    <span className="text-sm font-bold text-neural-200 leading-none">Dashboard</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                    <img src={currentUser.avatarUrl} className="w-5 h-5 rounded-full" />
                    <span className="text-xs font-medium">{currentUser.name}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 relative">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>

            <div className="max-w-7xl mx-auto space-y-10 relative z-10">
                
                {/* Header Actions */}
                <div className="flex items-end justify-between border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-3xl font-bold mb-2 tracking-tight">Your Projects</h2>
                        <p className="text-neural-400 text-sm max-w-md">Manage your intelligent workspaces. Switch between deep research analysis and free-form creative ideation.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neural-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input className="pl-9 pr-4 py-2.5 bg-neural-900 border border-white/10 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all" placeholder="Search projects..." />
                        </div>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-indigo-50 transition-all shadow-lg shadow-white/10 hover:scale-105 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> New Project
                        </button>
                    </div>
                </div>

                {/* Project Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    
                    {/* Create New Card (Inline Form) */}
                    {isCreating && (
                        <div className="group relative bg-neural-900 border border-indigo-500/50 rounded-xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 ring-4 ring-indigo-500/10 shadow-2xl">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1 block">Project Title</label>
                                <input 
                                    autoFocus
                                    className="w-full bg-transparent border-b border-indigo-500/30 py-2 text-xl font-bold focus:outline-none focus:border-indigo-500 placeholder-neural-700"
                                    placeholder="Untitled Project"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neural-500 mb-2 block">Select Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setNewMode(AppMode.RESEARCHER)}
                                        className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-all ${newMode === AppMode.RESEARCHER ? 'bg-blue-500/10 border-blue-500 text-blue-300 ring-1 ring-blue-500/50' : 'bg-neural-950 border-white/10 text-neural-500 hover:bg-white/5'}`}
                                    >
                                        <Cpu className="w-5 h-5" />
                                        Researcher
                                    </button>
                                    <button 
                                        onClick={() => setNewMode(AppMode.CREATOR)}
                                        className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-2 transition-all ${newMode === AppMode.CREATOR ? 'bg-orange-500/10 border-orange-500 text-orange-300 ring-1 ring-orange-500/50' : 'bg-neural-950 border-white/10 text-neural-500 hover:bg-white/5'}`}
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Creator
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-auto pt-2">
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-bold text-neural-400 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleCreate} className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white shadow-lg shadow-indigo-600/20">Create Project</button>
                            </div>
                        </div>
                    )}

                    {/* Project Cards */}
                    {projects.map(project => {
                        const isRes = project.mode === AppMode.RESEARCHER;
                        const themeColor = isRes ? 'text-blue-400' : 'text-orange-400';
                        const borderColor = isRes ? 'group-hover:border-blue-500/50' : 'group-hover:border-orange-500/50';
                        const bgHover = isRes ? 'group-hover:bg-blue-900/5' : 'group-hover:bg-orange-900/5';
                        const iconBg = isRes ? 'bg-blue-500/10' : 'bg-orange-500/10';

                        return (
                        <div 
                            key={project.id} 
                            onClick={() => onOpenProject(project.id)}
                            className={`
                                group relative bg-neural-900 border border-white/5 rounded-xl p-0 cursor-pointer 
                                transition-all duration-300 hover:-translate-y-1 overflow-hidden shadow-lg hover:shadow-2xl
                                ${borderColor} ${bgHover}
                            `}
                        >
                            {/* Top Accent Line */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${isRes ? 'bg-blue-500' : 'bg-orange-500'} opacity-60 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(59,130,246,0.5)]`}></div>
                            
                            <div className="p-6 pb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2.5 rounded-lg ${iconBg} ${themeColor} ring-1 ring-white/5`}>
                                        {isRes ? <Cpu className="w-6 h-6"/> : <Sparkles className="w-6 h-6"/>}
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded bg-neural-950 border border-white/5 ${themeColor}`}>
                                            {isRes ? 'Researcher' : 'Creator'}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-neural-100 mb-2 truncate group-hover:text-white transition-colors">{project.title}</h3>
                                <p className="text-sm text-neural-500 line-clamp-2 min-h-[2.5em] leading-relaxed">
                                    {project.description || "No description provided."}
                                </p>
                            </div>

                            <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs text-neural-500 group-hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5" title="Items">
                                        <FileText className="w-3.5 h-3.5" />
                                        {project.nodes.length}
                                    </span>
                                    <span className="flex items-center gap-1.5" title="Last Modified">
                                        <Clock className="w-3.5 h-3.5" />
                                        {getRelativeTime(project.lastModified)}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-1 ${themeColor} opacity-0 group-hover:opacity-100 transition-all font-bold translate-x-2 group-hover:translate-x-0`}>
                                    Open <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            
                            {/* Delete Action (Hidden) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                                className="absolute top-4 right-4 p-2 text-neural-600 hover:text-red-400 hover:bg-neural-950 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                                title="Delete Project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );})}

                    {projects.length === 0 && !isCreating && (
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-neural-600 border border-dashed border-neural-800 rounded-xl bg-neural-900/20">
                            <Layout className="w-16 h-16 mb-6 opacity-20" />
                            <h3 className="text-xl font-bold text-neural-400 mb-2">No projects yet</h3>
                            <p className="text-sm mb-8">Create a new intelligent workspace to get started.</p>
                            <button onClick={() => setIsCreating(true)} className="px-6 py-3 bg-neural-100 hover:bg-white text-neural-900 rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-white/20">
                                Create First Project
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
