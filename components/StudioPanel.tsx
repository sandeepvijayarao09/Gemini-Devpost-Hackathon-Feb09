
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppMode, AnalysisResult } from '../types';
import { 
  X, Headphones, HelpCircle, Network, FileText, Briefcase, Loader2, Globe, Clock, ScanSearch, Lightbulb, Table2, MessageSquareDashed, LayoutGrid, Quote, Wrench, FileOutput, GitMerge,
  Compass, BookOpen, Database, Scale, Megaphone,
  Zap, Pencil, Share2, Layers, StickyNote, Sparkles, Map, ListTodo,
  TrendingUp, Users, Film, Camera, Image as ImageIcon, AlignLeft, Calendar, Mail,
  ChevronDown, ChevronRight
} from 'lucide-react';

interface StudioPanelProps {
  mode: AppMode;
  results: AnalysisResult[];
  onRunStudioTask: (task: string, options?: any) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({ 
  mode, 
  results, 
  onRunStudioTask,
  onClose,
  isProcessing
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'outputs'>('tools');
  const isResearch = mode === AppMode.RESEARCHER;
  const accentText = isResearch ? 'text-blue-400' : 'text-orange-400';
  const accentBorder = isResearch ? 'border-blue-500' : 'border-orange-500';

  // --- Creator Mode State ---
  const [seedIdea, setSeedIdea] = useState('');
  const [scriptTone, setScriptTone] = useState('Engaging');
  const [scriptPlatform, setScriptPlatform] = useState('YouTube');
  
  // Collapsible Sections
  const [expandedSection, setExpandedSection] = useState<string | null>('seed');

  // Switch to output tab automatically when results come in
  React.useEffect(() => {
      if (results.length > 0 && isProcessing) {
          setActiveTab('outputs');
      }
  }, [results.length, isProcessing]);

  const toggleSection = (id: string) => {
      setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="w-[360px] h-full bg-neural-900 border-l border-neural-800 flex flex-col z-20 shadow-2xl">
      {/* Header */}
      <div className={`p-4 border-b border-neural-800 flex justify-between items-center ${isResearch ? 'bg-blue-900/10' : 'bg-orange-900/10'}`}>
        <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${accentText}`}>
            {isResearch ? <Briefcase className="w-4 h-4"/> : <Lightbulb className="w-4 h-4"/>}
            {isResearch ? 'Research Studio' : 'Creator Studio'}
        </h2>
        <button onClick={onClose} className="text-neural-500 hover:text-white"><X className="w-4 h-4"/></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neural-800 bg-neural-900">
          <button 
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'tools' ? `${accentBorder} ${accentText} bg-neural-800` : 'border-transparent text-neural-500 hover:text-neural-300'}`}
          >
              <Wrench className="w-3.5 h-3.5" /> Tools
          </button>
          <button 
            onClick={() => setActiveTab('outputs')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 border-b-2 ${activeTab === 'outputs' ? `${accentBorder} ${accentText} bg-neural-800` : 'border-transparent text-neural-500 hover:text-neural-300'}`}
          >
              <FileOutput className="w-3.5 h-3.5" /> Outputs
              {results.length > 0 && <span className="bg-neural-700 text-white px-1.5 py-0.5 rounded-full text-[9px]">{results.length}</span>}
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-neural-900 scrollbar-thin scrollbar-thumb-neural-700">
        
        {/* TAB: TOOLS */}
        {activeTab === 'tools' && (
            <div className="space-y-4">
                
                {/* --- CREATOR MODE WORKFLOW --- */}
                {!isResearch && (
                    <>
                         {/* Quick Actions Bar */}
                         <div className="grid grid-cols-2 gap-2 mb-4">
                            <button 
                                onClick={() => onRunStudioTask('quick_note')}
                                className="py-2 bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-500/20 hover:border-yellow-500/40 text-yellow-200/80 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <StickyNote className="w-3.5 h-3.5" /> Quick Note
                            </button>
                            <button 
                                onClick={() => onRunStudioTask('spark_idea')}
                                className="py-2 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-500/20 hover:border-purple-500/40 text-purple-200/80 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Spark Idea
                            </button>
                         </div>

                         {/* PHASE 1: IDEATION (The Seed) */}
                         <div className={`rounded-xl border ${expandedSection === 'seed' ? 'bg-neural-800/50 border-orange-500/30' : 'bg-neural-950 border-neural-800'} overflow-hidden transition-all`}>
                             <button onClick={() => toggleSection('seed')} className="w-full flex items-center gap-3 p-4 text-left">
                                 <div className={`p-2 rounded-lg ${expandedSection === 'seed' ? 'bg-orange-500 text-white' : 'bg-neural-800 text-neural-500'}`}>
                                     <Zap className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`text-sm font-bold ${expandedSection === 'seed' ? 'text-white' : 'text-neural-400'}`}>The Seed</h3>
                                     <p className="text-[10px] text-neural-500">Ideation & Validation</p>
                                 </div>
                                 {expandedSection === 'seed' ? <ChevronDown className="w-4 h-4 text-neural-500"/> : <ChevronRight className="w-4 h-4 text-neural-500"/>}
                             </button>
                             
                             {expandedSection === 'seed' && (
                                 <div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in space-y-3">
                                     <div>
                                        <label className="text-[10px] font-bold uppercase text-neural-500 mb-1 block">Concept / Topic</label>
                                        <textarea 
                                            className="w-full bg-neural-950 border border-neural-700 rounded-lg p-2 text-xs text-white placeholder-neural-600 focus:border-orange-500 outline-none"
                                            rows={2}
                                            placeholder="e.g. AI is changing education..."
                                            value={seedIdea}
                                            onChange={e => setSeedIdea(e.target.value)}
                                        />
                                     </div>
                                     <div className="grid grid-cols-2 gap-2">
                                         <StudioCardSmall 
                                            icon={<ScanSearch className="w-4 h-4 text-orange-400"/>} 
                                            label="Idea Validator" 
                                            onClick={() => onRunStudioTask('idea_validation', { rawInput: seedIdea })}
                                            disabled={isProcessing || !seedIdea}
                                         />
                                         <StudioCardSmall 
                                            icon={<TrendingUp className="w-4 h-4 text-pink-400"/>} 
                                            label="Trend Scout" 
                                            onClick={() => onRunStudioTask('trend_analysis', { rawInput: seedIdea })}
                                            disabled={isProcessing || !seedIdea}
                                         />
                                     </div>
                                     <StudioCardSmall 
                                        icon={<Users className="w-4 h-4 text-blue-400"/>} 
                                        label="Audience Persona Generator" 
                                        onClick={() => onRunStudioTask('audience_persona', { rawInput: seedIdea })}
                                        disabled={isProcessing || !seedIdea}
                                        fullWidth
                                     />
                                 </div>
                             )}
                         </div>

                         {/* PHASE 2: PRE-PRODUCTION (The Blueprint) */}
                         <div className={`rounded-xl border ${expandedSection === 'blueprint' ? 'bg-neural-800/50 border-orange-500/30' : 'bg-neural-950 border-neural-800'} overflow-hidden transition-all`}>
                             <button onClick={() => toggleSection('blueprint')} className="w-full flex items-center gap-3 p-4 text-left">
                                 <div className={`p-2 rounded-lg ${expandedSection === 'blueprint' ? 'bg-orange-500 text-white' : 'bg-neural-800 text-neural-500'}`}>
                                     <Pencil className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`text-sm font-bold ${expandedSection === 'blueprint' ? 'text-white' : 'text-neural-400'}`}>The Blueprint</h3>
                                     <p className="text-[10px] text-neural-500">Structure & Planning</p>
                                 </div>
                                 {expandedSection === 'blueprint' ? <ChevronDown className="w-4 h-4 text-neural-500"/> : <ChevronRight className="w-4 h-4 text-neural-500"/>}
                             </button>

                             {expandedSection === 'blueprint' && (
                                 <div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in space-y-3">
                                     <div className="grid grid-cols-2 gap-2">
                                         <select 
                                             value={scriptPlatform} onChange={e => setScriptPlatform(e.target.value)}
                                             className="w-full bg-neural-950 border border-neural-700 rounded p-1.5 text-[10px] text-white outline-none"
                                         >
                                             <option>YouTube</option>
                                             <option>LinkedIn</option>
                                             <option>Blog</option>
                                             <option>TikTok</option>
                                         </select>
                                         <select 
                                             value={scriptTone} onChange={e => setScriptTone(e.target.value)}
                                             className="w-full bg-neural-950 border border-neural-700 rounded p-1.5 text-[10px] text-white outline-none"
                                         >
                                             <option>Engaging</option>
                                             <option>Academic</option>
                                             <option>Hype</option>
                                             <option>Professional</option>
                                         </select>
                                     </div>
                                     
                                     <div className="grid grid-cols-2 gap-2">
                                         <StudioCardSmall 
                                            icon={<Film className="w-4 h-4 text-yellow-400"/>} 
                                            label="Scriptwriter" 
                                            onClick={() => onRunStudioTask('script_generation', { tone: scriptTone, platform: scriptPlatform, rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                         <StudioCardSmall 
                                            icon={<LayoutGrid className="w-4 h-4 text-fuchsia-400"/>} 
                                            label="Storyboard" 
                                            onClick={() => onRunStudioTask('storyboard', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                         <StudioCardSmall 
                                            icon={<Camera className="w-4 h-4 text-cyan-400"/>} 
                                            label="Shot List" 
                                            onClick={() => onRunStudioTask('shot_list', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                         <StudioCardSmall 
                                            icon={<Network className="w-4 h-4 text-emerald-400"/>} 
                                            label="Visual Map" 
                                            onClick={() => onRunStudioTask('visual_synthesis', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* PHASE 3: PRODUCTION ASSETS (The Craft) */}
                         <div className={`rounded-xl border ${expandedSection === 'craft' ? 'bg-neural-800/50 border-orange-500/30' : 'bg-neural-950 border-neural-800'} overflow-hidden transition-all`}>
                             <button onClick={() => toggleSection('craft')} className="w-full flex items-center gap-3 p-4 text-left">
                                 <div className={`p-2 rounded-lg ${expandedSection === 'craft' ? 'bg-orange-500 text-white' : 'bg-neural-800 text-neural-500'}`}>
                                     <Sparkles className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`text-sm font-bold ${expandedSection === 'craft' ? 'text-white' : 'text-neural-400'}`}>The Craft</h3>
                                     <p className="text-[10px] text-neural-500">Hooks, Thumbs & Copy</p>
                                 </div>
                                 {expandedSection === 'craft' ? <ChevronDown className="w-4 h-4 text-neural-500"/> : <ChevronRight className="w-4 h-4 text-neural-500"/>}
                             </button>

                             {expandedSection === 'craft' && (
                                 <div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in space-y-3">
                                     <div className="grid grid-cols-2 gap-2">
                                         <StudioCardSmall 
                                            icon={<Zap className="w-4 h-4 text-yellow-400"/>} 
                                            label="Viral Hooks" 
                                            onClick={() => onRunStudioTask('viral_hooks', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                         <StudioCardSmall 
                                            icon={<ImageIcon className="w-4 h-4 text-rose-400"/>} 
                                            label="Thumb Ideas" 
                                            onClick={() => onRunStudioTask('thumbnail_ideas', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                     </div>
                                     <StudioCardSmall 
                                        icon={<AlignLeft className="w-4 h-4 text-indigo-400"/>} 
                                        label="SEO Captions & Descriptions" 
                                        onClick={() => onRunStudioTask('caption_writing', { rawInput: seedIdea })}
                                        disabled={isProcessing}
                                        fullWidth
                                     />
                                 </div>
                             )}
                         </div>

                         {/* PHASE 4: DISTRIBUTION (The Explosion) */}
                         <div className={`rounded-xl border ${expandedSection === 'explosion' ? 'bg-neural-800/50 border-orange-500/30' : 'bg-neural-950 border-neural-800'} overflow-hidden transition-all`}>
                             <button onClick={() => toggleSection('explosion')} className="w-full flex items-center gap-3 p-4 text-left">
                                 <div className={`p-2 rounded-lg ${expandedSection === 'explosion' ? 'bg-orange-500 text-white' : 'bg-neural-800 text-neural-500'}`}>
                                     <Share2 className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`text-sm font-bold ${expandedSection === 'explosion' ? 'text-white' : 'text-neural-400'}`}>The Explosion</h3>
                                     <p className="text-[10px] text-neural-500">Repurpose & Distribute</p>
                                 </div>
                                 {expandedSection === 'explosion' ? <ChevronDown className="w-4 h-4 text-neural-500"/> : <ChevronRight className="w-4 h-4 text-neural-500"/>}
                             </button>

                             {expandedSection === 'explosion' && (
                                 <div className="p-4 pt-0 animate-in slide-in-from-top-2 fade-in space-y-3">
                                     <StudioCardSmall 
                                        icon={<Layers className="w-4 h-4 text-green-400"/>} 
                                        label="Content Repurposer" 
                                        onClick={() => onRunStudioTask('repurpose_content', { rawInput: seedIdea })}
                                        disabled={isProcessing}
                                        fullWidth
                                     />
                                     <div className="grid grid-cols-2 gap-2">
                                         <StudioCardSmall 
                                            icon={<Calendar className="w-4 h-4 text-blue-400"/>} 
                                            label="Social Calendar" 
                                            onClick={() => onRunStudioTask('social_calendar', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                         <StudioCardSmall 
                                            icon={<Mail className="w-4 h-4 text-purple-400"/>} 
                                            label="Email Draft" 
                                            onClick={() => onRunStudioTask('email_draft', { rawInput: seedIdea })}
                                            disabled={isProcessing}
                                         />
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Planning Tools (Fallback) */}
                         <div className="pt-4 border-t border-neural-800">
                             <p className="text-[10px] font-bold uppercase text-neural-500 mb-3 pl-1">General Planning</p>
                             <div className="grid grid-cols-2 gap-3">
                                <StudioCardSmall 
                                    icon={<Network className="w-4 h-4 text-fuchsia-400" />}
                                    label="Mindmap"
                                    onClick={() => onRunStudioTask('mindmap')}
                                    disabled={isProcessing}
                                />
                                <StudioCardSmall 
                                    icon={<ListTodo className="w-4 h-4 text-sky-400" />}
                                    label="Project Plan"
                                    onClick={() => onRunStudioTask('planning')}
                                    disabled={isProcessing}
                                />
                                <StudioCardSmall 
                                    icon={<FileText className="w-4 h-4 text-emerald-400" />}
                                    label="Documentation"
                                    onClick={() => onRunStudioTask('documentation')}
                                    disabled={isProcessing}
                                />
                                <StudioCardSmall 
                                    icon={<Headphones className="w-4 h-4 text-orange-400" />}
                                    label="Audio Overview"
                                    onClick={() => onRunStudioTask('podcast_audio')}
                                    disabled={isProcessing}
                                />
                             </div>
                         </div>
                    </>
                )}

                {/* --- RESEARCHER MODE --- */}
                {isResearch && (
                    <div className="space-y-6">
                        {/* Section: Organization */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold uppercase text-neural-500 tracking-widest pl-1">Organization & Structure</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <StudioCard 
                                    icon={<LayoutGrid className="w-5 h-5 text-fuchsia-400" />}
                                    title="Smart Organize"
                                    onClick={() => onRunStudioTask('organize')}
                                    disabled={isProcessing}
                                    desc="Cluster items"
                                />
                                <StudioCard 
                                    icon={<Quote className="w-5 h-5 text-lime-400" />}
                                    title="Citation Gen"
                                    onClick={() => onRunStudioTask('citation')}
                                    disabled={isProcessing}
                                    desc="APA, MLA, BibTeX"
                                />
                            </div>
                        </div>

                        {/* Section: Research Lifecycle */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold uppercase text-neural-500 tracking-widest pl-1">Research Lifecycle</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <StudioCard 
                                    icon={<Compass className="w-5 h-5 text-cyan-400" />}
                                    title="Research Design"
                                    onClick={() => onRunStudioTask('research_design')}
                                    disabled={isProcessing}
                                    desc="Methodology formulation"
                                />
                                <StudioCard 
                                    icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
                                    title="Lit Review"
                                    onClick={() => onRunStudioTask('literature_review')}
                                    disabled={isProcessing}
                                    desc="Synthesize knowledge"
                                />
                                <StudioCard 
                                    icon={<Database className="w-5 h-5 text-emerald-400" />}
                                    title="Data Analysis"
                                    onClick={() => onRunStudioTask('data_analysis')}
                                    disabled={isProcessing}
                                    desc="Gather & Interpret"
                                />
                                <StudioCard 
                                    icon={<Scale className="w-5 h-5 text-rose-400" />}
                                    title="Ethics Check"
                                    onClick={() => onRunStudioTask('ethics_review')}
                                    disabled={isProcessing}
                                    desc="Standards & Compliance"
                                />
                                <StudioCard 
                                    icon={<Megaphone className="w-5 h-5 text-yellow-400" />}
                                    title="Dissemination"
                                    onClick={() => onRunStudioTask('dissemination_plan')}
                                    disabled={isProcessing}
                                    desc="Publish & Present"
                                />
                            </div>
                        </div>

                        {/* Section: Deep Analysis */}
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold uppercase text-neural-500 tracking-widest pl-1">Deep Analysis</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <StudioCard 
                                    icon={<GitMerge className="w-5 h-5 text-violet-400" />}
                                    title="Connect Dots"
                                    onClick={() => onRunStudioTask('connect_dots')}
                                    disabled={isProcessing}
                                    desc="Find logical path"
                                />
                                <StudioCard 
                                    icon={<ScanSearch className="w-5 h-5 text-blue-400" />}
                                    title="Pattern Decoder"
                                    onClick={() => onRunStudioTask('patterns')}
                                    disabled={isProcessing}
                                    desc="Find connections"
                                />
                                <StudioCard 
                                    icon={<Table2 className="w-5 h-5 text-emerald-400" />}
                                    title="Compare Sources"
                                    onClick={() => onRunStudioTask('compare')}
                                    disabled={isProcessing}
                                    desc="Comparison Matrix"
                                />
                                <StudioCard 
                                    icon={<Globe className="w-5 h-5 text-indigo-400" />}
                                    title="Web Deep Dive"
                                    onClick={() => onRunStudioTask('web_research')}
                                    disabled={isProcessing}
                                    desc="Search context"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* TAB: OUTPUTS */}
        {activeTab === 'outputs' && (
            <div className="space-y-4">
                {isProcessing && (
                    <div className="p-8 flex flex-col items-center justify-center text-neural-500 gap-3 border border-dashed border-neural-800 rounded-lg animate-pulse">
                        <Loader2 className={`w-6 h-6 animate-spin ${accentText}`} />
                        <p className="text-xs">Generating content...</p>
                    </div>
                )}

                {results.length === 0 && !isProcessing && (
                    <div className="mt-12 text-center px-6">
                        <div className="w-12 h-12 bg-neural-800 rounded-full flex items-center justify-center mx-auto mb-3 text-neural-600">
                            <FileOutput className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-neural-500">No outputs yet.<br/>Select a tool from the Tools tab to generate insights.</p>
                    </div>
                )}

                {results.map((res, i) => (
                    <div 
                        key={i} 
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/neural-node', JSON.stringify({
                                type: 'TEXT',
                                content: res.content,
                                title: res.title
                            }));
                        }}
                        className="bg-neural-950/50 rounded-xl border border-neural-800 overflow-hidden shadow-sm hover:border-neural-700 transition-colors cursor-grab active:cursor-grabbing hover:scale-[1.01]"
                    >
                        <div className="px-4 py-3 bg-neural-900 border-b border-neural-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-neural-200 truncate pr-2">{res.title}</span>
                            <span className="text-[10px] text-neural-500 shrink-0">{new Date(res.timestamp).toLocaleTimeString()}</span>
                        </div>
                        
                        {res.type === 'audio' && res.audioData ? (
                            <div className="p-4 flex flex-col items-center gap-4 bg-gradient-to-br from-neural-950 to-black">
                                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
                                    <Headphones className="w-8 h-8 text-orange-400" />
                                </div>
                                <audio 
                                    controls 
                                    className="w-full h-8" 
                                    src={`data:audio/wav;base64,${res.audioData}`}
                                    autoPlay={i === 0} 
                                />
                            </div>
                        ) : (
                            <div className="p-4 max-h-[400px] overflow-y-auto prose prose-invert prose-sm text-neural-300 scrollbar-thin scrollbar-thumb-neural-700 pointer-events-none">
                                <ReactMarkdown 
                                    components={{
                                    a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
                                    table: ({node, ...props}) => <table {...props} className="w-full text-left border-collapse text-xs my-2" />,
                                    th: ({node, ...props}) => <th {...props} className="border-b border-neural-700 p-2 font-bold text-neural-200 bg-neural-800/50" />,
                                    td: ({node, ...props}) => <td {...props} className="border-b border-neural-800 p-2 text-neural-400" />
                                    }}
                                >
                                {res.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};

const StudioCard: React.FC<{icon: React.ReactNode, title: string, onClick: () => void, disabled?: boolean, desc: string}> = ({ icon, title, onClick, disabled, desc }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-start gap-2 p-3 bg-neural-950 hover:bg-neural-800 border border-neural-800 hover:border-neural-700 rounded-xl transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group h-24 hover:-translate-y-1 hover:shadow-lg"
  >
    <div className="flex w-full items-start justify-between">
        <div className="p-1.5 bg-neural-900 rounded-lg shadow-inner border border-neural-800 group-hover:border-neural-700">
            {icon}
        </div>
    </div>
    <div>
        <span className="block text-xs font-bold text-neural-200">{title}</span>
        <span className="block text-[10px] text-neural-500 mt-0.5">{desc}</span>
    </div>
  </button>
);

const StudioCardSmall: React.FC<{icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean, fullWidth?: boolean}> = ({ icon, label, onClick, disabled, fullWidth }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3 bg-neural-900 hover:bg-neural-800 border border-neural-700 hover:border-neural-600 rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group ${fullWidth ? 'w-full' : ''}`}
    >
        <div className="shrink-0">{icon}</div>
        <span className="text-[11px] font-medium text-neural-200 leading-tight">{label}</span>
    </button>
);
