
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, SidebarTab } from './Sidebar';
import { Canvas } from './Canvas';
import { StudioPanel } from './StudioPanel';
import { ChatOverlay } from './ChatOverlay';
import { TeamChatWidget } from './TeamChatWidget';
import { AppMode, CanvasNode, NodeType, AnalysisResult, User, ChatSession, ToastMessage, ChatMessage, Project, ProjectRole, TeamMessage, Comment, ProjectVersion } from '../types';
import { AVAILABLE_MODELS } from '../constants';
import { askChat, runStudioTask, generatePodcastAudio, enrichSourceContent, generateChatSuggestions, organizeCanvasNodes, generateCitation, generateImage, getCreativeInspiration } from '../services/geminiService';
import { PanelRightOpen, Menu, Layout, Crown, Eye, Edit3, Share2, Lock, Plus, Save, RotateCcw, Cloud, CloudOff, History } from 'lucide-react';
import { ToastContainer } from './ToastContainer';
import { LiveSessionOverlay } from './LiveSessionOverlay';

interface WorkspaceProps {
    project: Project;
    onSave: (updatedProject: Project) => void;
    onBack: () => void;
    currentUser: User;
    availableUsers: User[];
    onCreateNewProject: (title: string, description: string, mode: AppMode) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ project, onSave, onBack, currentUser, availableUsers, onCreateNewProject }) => {
  // Initialize state FROM PROJECT PROP
  // Note: mode is now derived directly from project and is immutable within the workspace
  const mode = project.mode;
  const [nodes, setNodes] = useState<CanvasNode[]>(project.nodes);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(project.chatSessions);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>(project.teamChat || []);
  const [versions, setVersions] = useState<ProjectVersion[]>(project.versions || []);
  const [autoSave, setAutoSave] = useState<boolean>(project.autoSave ?? true);
  
  // Local Workspace State
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // History
  const [historyPast, setHistoryPast] = useState<CanvasNode[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<CanvasNode[][]>([]);

  // Layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('assets');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Camera
  const [focusPoint, setFocusPoint] = useState<{x: number, y: number} | null>(null);

  // Wiring
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  
  // Studio
  const [studioResults, setStudioResults] = useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Chat
  const [currentChatId, setCurrentChatId] = useState<string>(chatSessions.length > 0 ? chatSessions[0].id : '');
  
  // Live Mode
  const [isLiveMode, setIsLiveMode] = useState(false);

  const currentChat = chatSessions.find(c => c.id === currentChatId) || chatSessions[0];
  const chatHistory = currentChat ? currentChat.messages : [];
  const currentSuggestions = currentChat ? currentChat.suggestedActions : [];

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
      // Use random string for ID to prevent collisions if multiple toasts fire at once
      const id = Math.random().toString(36).substring(7);
      setToasts(prev => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 5000);
  };
  
  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- SAVE SYNC LOGIC ---
  const saveProjectRef = useRef<(() => void) | undefined>(undefined);

  // Function to build the project object
  const getProjectObject = () => ({
      ...project,
      nodes,
      chatSessions,
      teamChat: teamMessages,
      mode,
      lastModified: Date.now(),
      previewNodeCount: nodes.length,
      versions,
      autoSave
  });

  // Manual Save Function
  const handleManualSave = () => {
      const updatedProject = getProjectObject();
      onSave(updatedProject);
      setUnsavedChanges(false);
      addToast('success', 'Project Saved');
  };

  // Toggle AutoSave
  const toggleAutoSave = () => {
      const newVal = !autoSave;
      setAutoSave(newVal);
      if (newVal) {
          handleManualSave(); // Save immediately when turning on
      }
  };

  // Effect to handle changes
  useEffect(() => {
    // Determine if anything changed relative to "saved" state logic would be complex, 
    // so we assume any change to these dependencies is a change.
    
    if (autoSave) {
        // Debounce autosave could be added here, for now direct sync
        const updatedProject = getProjectObject();
        onSave(updatedProject);
        setUnsavedChanges(false);
    } else {
        setUnsavedChanges(true);
    }
  }, [nodes, chatSessions, teamMessages, mode, versions, autoSave]);

  useEffect(() => {
      if (chatSessions.length > 0 && !chatSessions.find(c => c.id === currentChatId)) {
          setCurrentChatId(chatSessions[0].id);
      }
      if (chatSessions.length === 0) {
          handleNewChat();
      }
  }, [chatSessions]);

  // Visual Theme Logic
  const isResearch = mode === AppMode.RESEARCHER;
  const bgStyle = isResearch 
      ? { backgroundColor: '#0f1117', backgroundImage: 'radial-gradient(circle at 1px 1px, #30363d 1px, transparent 0)' }
      : { backgroundColor: '#1c1917', backgroundImage: 'radial-gradient(circle at 1px 1px, #44403c 1px, transparent 0)' }; 

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsStudioOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- UNDO / REDO ---
  const saveHistory = useCallback(() => {
      setHistoryPast(prev => [...prev, nodes]);
      setHistoryFuture([]); 
      if (!autoSave) setUnsavedChanges(true);
  }, [nodes, autoSave]);

  const undo = useCallback(() => {
      if (historyPast.length === 0) return;
      const previous = historyPast[historyPast.length - 1];
      const newPast = historyPast.slice(0, -1);
      setHistoryFuture(prev => [nodes, ...prev]);
      setHistoryPast(newPast);
      setNodes(previous);
  }, [historyPast, nodes]);

  const redo = useCallback(() => {
      if (historyFuture.length === 0) return;
      const next = historyFuture[0];
      const newFuture = historyFuture.slice(1);
      setHistoryPast(prev => [...prev, nodes]);
      setHistoryFuture(newFuture);
      setNodes(next);
  }, [historyFuture, nodes]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.shiftKey) redo();
              else undo();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo();
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleManualSave();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, nodes, chatSessions, teamMessages]);

  // --- VERSION CONTROL LOGIC ---
  const handleCreateVersion = (name?: string) => {
      const versionName = name || `Version ${versions.length + 1}`;
      const newVersion: ProjectVersion = {
          id: `v-${Date.now()}`,
          name: versionName,
          timestamp: Date.now(),
          createdBy: currentUser.name,
          nodes: JSON.parse(JSON.stringify(nodes)), // Deep copy
          chatSessions: JSON.parse(JSON.stringify(chatSessions))
      };
      setVersions(prev => [newVersion, ...prev]);
      addToast('success', `Version "${versionName}" saved.`);
  };

  const handleRestoreVersion = (versionId: string) => {
      const targetVersion = versions.find(v => v.id === versionId);
      if (!targetVersion) return;

      if (window.confirm("Are you sure? Current changes will be overwritten. We recommend creating a new version before restoring.")) {
          // Optional: Auto-create a backup of current before restoring
          handleCreateVersion(`Backup before restore ${new Date().toLocaleTimeString()}`);
          
          setNodes(targetVersion.nodes);
          setChatSessions(targetVersion.chatSessions);
          addToast('success', `Restored to "${targetVersion.name}"`);
      }
  };

  // --- LOGIC FUNCTIONS ---
  const getUserSpawnPosition = (userId: string) => {
    const userNodes = nodes.filter(n => n.ownerId === userId);
    if (userNodes.length > 0) {
        const lastNode = userNodes[userNodes.length - 1];
        return { x: lastNode.position.x + 50 + (Math.random() * 50), y: lastNode.position.y + 50 + (Math.random() * 50) };
    }
    return { x: 400, y: 300 };
  };

  const handleFlyToUser = (userId: string) => {
      const userNodes = nodes.filter(n => n.ownerId === userId);
      if (userNodes.length > 0) {
          const total = userNodes.reduce((acc, n) => ({ x: acc.x + n.position.x, y: acc.y + n.position.y }), { x: 0, y: 0 });
          setFocusPoint({ x: total.x / userNodes.length, y: total.y / userNodes.length });
      } else {
          setFocusPoint({ x: 400, y: 300 });
      }
  };

  const enrichNodeContent = async (nodeId: string, url: string, type: 'video' | 'website') => {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, content: "🔮 AI is analyzing this source from the web... please wait." } : n));
      try {
        const enrichedText = await enrichSourceContent(url, type);
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, content: enrichedText } : n));
        addToast('success', `${type === 'video' ? 'Video' : 'Link'} content analyzed successfully`);
      } catch (err) {
          addToast('error', "Failed to enrich content from URL");
      }
  };

  const handleAddNode = (type: NodeType, content: string = '', title: string = 'New Item', url?: string, data?: string, mimeType?: string) => {
    saveHistory();
    const position = getUserSpawnPosition(currentUser.id);
    const newNode: CanvasNode = {
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      title: type === NodeType.FILE ? title : `${title}`,
      content: content || "Start typing...",
      url,
      data,
      mimeType,
      fileName: title,
      position,
      ownerId: currentUser.id
    };
    setNodes(prev => [...prev, newNode]);
    if (isMobile) setIsSidebarOpen(false);
    if ((type === NodeType.LINK || type === NodeType.VIDEO) && url) {
        enrichNodeContent(newNode.id, url, type === NodeType.VIDEO ? 'video' : 'website');
    } else {
        addToast('success', `${type} added to canvas`);
    }
    return newNode;
  };

  const handleNodeDrop = (type: NodeType, content: string, title: string, position: {x: number, y: number}) => {
    saveHistory();
    const newNode: CanvasNode = {
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      title,
      content,
      position,
      ownerId: currentUser.id
    };
    setNodes(prev => [...prev, newNode]);
    addToast('success', 'Content dropped on canvas');
  };

  const handleConnectStart = (id: string) => setConnectingNodeId(id);
  const handleConnectEnd = (targetId: string) => {
    if (connectingNodeId && connectingNodeId !== targetId) {
      saveHistory();
      setNodes(prev => prev.map(node => {
        if (node.id === targetId) {
          const currentParents = node.parentIds || [];
          if (!currentParents.includes(connectingNodeId) && connectingNodeId !== node.id) {
            return { ...node, parentIds: [...currentParents, connectingNodeId] };
          }
        }
        return node;
      }));
      addToast('success', "Nodes connected");
    }
    setConnectingNodeId(null);
  };

  const handleDeleteNode = (id: string) => {
      saveHistory();
      setNodes(prev => {
          const filtered = prev.filter(n => n.id !== id);
          return filtered.map(n => ({ ...n, parentIds: n.parentIds?.filter(pid => pid !== id) }));
      });
      setSelectedNodeIds(prev => prev.filter(sid => sid !== id));
      addToast('info', "Item removed");
  }

  const handleNodeResize = (id: string, width: number, height: number) => {
      // Don't save history on every frame of resize, handled by NodeItem sending dragStart event
      setNodes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
  };

  // --- COMMENTS ---
  const handleAddComment = (nodeId: string, content: string) => {
      const newComment: Comment = {
          id: `cmt-${Date.now()}`,
          userId: currentUser.id,
          content,
          timestamp: Date.now()
      };
      setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
              return { ...n, comments: [...(n.comments || []), newComment] };
          }
          return n;
      }));
  };

  const handleDeleteComment = (nodeId: string, commentId: string) => {
      setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
              return { ...n, comments: (n.comments || []).filter(c => c.id !== commentId) };
          }
          return n;
      }));
  };

  // --- IMAGE GENERATION (VISUALIZER) ---
  const handleGenerateImage = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    addToast('info', 'Generating visualization...');
    
    // Create image from text content
    const result = await generateImage(node.content);
    
    if (result) {
        saveHistory();
        const newNode: CanvasNode = {
            id: `img-${Date.now()}`,
            type: NodeType.FILE,
            title: `Visual: ${node.title}`,
            content: "AI Generated Image",
            data: result.base64,
            mimeType: result.mimeType,
            position: { x: node.position.x + 320, y: node.position.y },
            parentIds: [nodeId],
            ownerId: currentUser.id
        };
        setNodes(prev => [...prev, newNode]);
        addToast('success', 'Image generated successfully');
    } else {
        addToast('error', 'Failed to generate image');
    }
  };

  // --- STUDIO TASKS ---
  const handleRunStudioTask = async (task: string, options?: any) => {
     setIsProcessing(true);
     if (!isStudioOpen) setIsStudioOpen(true);
     const targetNodes = selectedNodeIds.length > 0 ? nodes.filter(n => selectedNodeIds.includes(n.id)) : nodes;
     
     // Local Tasks (No AI call or simple wrapper)
     if (task === 'quick_note') {
         handleAddNode(NodeType.TEXT, "New idea...", "Quick Note");
         setIsProcessing(false);
         return;
     }

     if (task === 'spark_idea') {
         const inspiration = await getCreativeInspiration();
         handleAddNode(NodeType.TEXT, inspiration, "Creative Spark");
         setIsProcessing(false);
         return;
     }

     if (task === 'organize') {
         if (targetNodes.length === 0) { setIsProcessing(false); addToast('info', "Nothing to organize"); return; }
         const { clusters } = await organizeCanvasNodes(targetNodes);
         if (clusters.length > 0) {
             saveHistory();
             let newNodes = [...nodes];
             let groupNodes: CanvasNode[] = [];
             clusters.forEach((cluster, i) => {
                 const clusterX = 200 + (i * 500);
                 const clusterY = 200;
                 groupNodes.push({
                     id: `group-${Date.now()}-${i}`,
                     type: NodeType.TEXT,
                     title: cluster.title,
                     content: `# ${cluster.title}\nAutomatic Cluster`,
                     position: { x: clusterX, y: clusterY - 150 },
                     ownerId: currentUser.id
                 });
                 let row = 0; let col = 0;
                 cluster.nodeIds.forEach(nodeId => {
                     const nodeIndex = newNodes.findIndex(n => n.id === nodeId);
                     if (nodeIndex > -1) {
                         newNodes[nodeIndex] = { ...newNodes[nodeIndex], position: { x: clusterX + (col * 50), y: clusterY + (row * 120) } };
                         row++;
                     }
                 });
             });
             setNodes([...newNodes, ...groupNodes]);
             addToast('success', "Canvas organized");
         }
         setIsProcessing(false);
         return;
     }

     if (task === 'citation') {
        if (targetNodes.length === 0) { addToast('error', "Select a node"); setIsProcessing(false); return; }
        const citation = await generateCitation(targetNodes[0]);
        setStudioResults(prev => [{ title: `Citation: ${targetNodes[0].title}`, content: citation, type: 'report', timestamp: Date.now() }, ...prev]);
        setIsProcessing(false);
        return;
     }

     if (task === 'podcast_audio') {
         const { audioData, error } = await generatePodcastAudio(targetNodes);
         if (audioData) setStudioResults(prev => [{ title: "Audio Overview", content: "Audio Generated", audioData, type: 'audio', timestamp: Date.now() }, ...prev]);
         else addToast('error', "Failed to generate podcast");
         setIsProcessing(false);
         return;
     }

     try {
         const result = await runStudioTask(task, targetNodes, selectedModel, options);
         saveHistory();
         
         const titleMap: any = {
             'mindmap': 'Mindmap Structure',
             'planning': 'Project Plan',
             'documentation': 'Documentation',
             'idea_validation': 'Validation Report',
             'trend_analysis': 'Trend Analysis',
             'audience_persona': 'Audience Persona',
             'script_generation': 'Script & Storyboard',
             'storyboard': 'Visual Storyboard',
             'shot_list': 'Shot List',
             'viral_hooks': 'Viral Hooks',
             'thumbnail_ideas': 'Thumbnail Concepts',
             'caption_writing': 'Social Captions',
             'social_calendar': 'Content Calendar',
             'email_draft': 'Newsletter Draft',
             'visual_synthesis': 'Visual Map',
             'repurpose_content': 'Repurposed Content'
         };

         // SMART POSITIONING LOGIC
         // Default to center-right of screen if nothing selected
         let spawnX = 600;
         let spawnY = 300;

         // If we have selected nodes, spawn to the right of the last selected node
         if (targetNodes.length > 0) {
             const lastNode = targetNodes[targetNodes.length - 1];
             spawnX = lastNode.position.x + 350; // Place it to the right
             spawnY = lastNode.position.y;
         } else if (focusPoint) {
             // If we have a focus point (e.g. flew to user), spawn nearby
             spawnX = focusPoint.x + 100;
             spawnY = focusPoint.y + 50;
         }

         // Add random jitter to prevent perfect stacking
         const jitterX = (Math.random() * 40) - 20;
         const jitterY = (Math.random() * 40) - 20;

         const newNode: CanvasNode = {
            id: `gen-${Date.now()}`,
            type: NodeType.TEXT,
            title: titleMap[task] || `Generated Result`,
            content: result,
            position: { x: spawnX + jitterX, y: spawnY + jitterY }, 
            parentIds: targetNodes.map(n => n.id),
            ownerId: currentUser.id
         };
         setNodes(prev => [...prev, newNode]);
         setStudioResults(prev => [{ title: newNode.title, content: result, type: 'report', timestamp: Date.now() }, ...prev]);
         addToast('success', `Task complete`);
     } catch (e) {
         addToast('error', "Analysis failed");
         console.error(e);
     } finally {
         setIsProcessing(false);
     }
  };

  // --- CHAT ---
  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      timestamp: Date.now(),
      suggestedActions: ["Summarize these sources", "Identify key themes"]
    };
    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const handleSaveToCanvas = (content: string) => {
      saveHistory();
      const newNode: CanvasNode = {
          id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: NodeType.TEXT,
          title: "Pinned Chat",
          content: content,
          position: getUserSpawnPosition(currentUser.id),
          ownerId: currentUser.id
      };
      setNodes(prev => [...prev, newNode]);
      addToast('success', "Chat pinned");
  };

  const handleSendMessage = async (message: string, attachments: File[] = [], isDeepResearch: boolean = false) => {
      const attachmentNodes: CanvasNode[] = []; 
      const targetNodes = selectedNodeIds.length > 0 ? nodes.filter(n => selectedNodeIds.includes(n.id)) : nodes;
      const contextNodes = [...targetNodes, ...attachmentNodes];
      
      const previousMessages = currentChat.messages;
      const newUserMsg: ChatMessage = { 
          id: `msg-${Date.now()}`,
          role: 'user', 
          userId: currentUser.id,
          content: message, 
          timestamp: Date.now() 
      };
      const newHistory = [...previousMessages, newUserMsg];

      setChatSessions(prev => prev.map(s => s.id === currentChatId ? { ...s, messages: newHistory, timestamp: Date.now() } : s));

      try {
          const response = await askChat(newHistory, message, mode, contextNodes, selectedModel, chatSessions, currentChatId, isDeepResearch);
          const aiMsg: ChatMessage = { id: `msg-${Date.now()}-ai`, role: 'ai', content: response, timestamp: Date.now() };
          
          setChatSessions(prev => prev.map(s => s.id === currentChatId ? { ...s, messages: [...newHistory, aiMsg] } : s));
          generateChatSuggestions([...newHistory, aiMsg], contextNodes).then(suggestions => {
              setChatSessions(prev => prev.map(s => s.id === currentChatId ? { ...s, suggestedActions: suggestions } : s));
          });
          return response;
      } catch (e) {
          addToast('error', "Failed to send message");
          return "Error processing request.";
      }
  };

  // --- TEAM CHAT ---
  const handleSendTeamMessage = (text: string) => {
      const msg: TeamMessage = {
          id: `tm-${Date.now()}`,
          userId: currentUser.id,
          content: text,
          timestamp: Date.now()
      };
      setTeamMessages(prev => [...prev, msg]);
  };

  const handleShareToTeam = () => {
      const lastMsg = currentChat.messages[currentChat.messages.length - 1];
      const previewText = lastMsg ? lastMsg.content.substring(0, 100) + '...' : 'New Session Started';
      
      const msg: TeamMessage = {
          id: `tm-${Date.now()}`,
          userId: currentUser.id,
          content: `Shared an AI session: ${currentChat.title}`,
          timestamp: Date.now(),
          attachment: {
              type: 'session_share',
              sessionId: currentChat.id,
              title: currentChat.title,
              preview: previewText
          }
      };
      setTeamMessages(prev => [...prev, msg]);
      addToast('success', "Session shared to Team Chat");
  };

  // --- LIVE SESSION ---
  const handleLiveSessionClose = (data?: { transcript: string, summary: string }) => {
      setIsLiveMode(false);
      
      if (data) {
          saveHistory();
          const pos = getUserSpawnPosition(currentUser.id);
          const newNode: CanvasNode = {
            id: `live-${Date.now()}`,
            type: NodeType.TEXT,
            title: `Live Session Summary`,
            content: `## Executive Summary\n${data.summary}\n\n---\n\n## Full Transcript\n${data.transcript}`,
            position: pos,
            width: 400,
            height: 500,
            ownerId: currentUser.id
          };
          setNodes(prev => [...prev, newNode]);
          addToast('success', "Live Session Saved to Canvas");
      }
  };

  // --- HEADER HELPERS ---
  const getSortedCollaborators = () => {
      if (!project.collaborators) return [];
      // Rank: Owner(0) > Editor(1) > Viewer(2)
      const rank = { owner: 0, editor: 1, viewer: 2 };
      
      return [...project.collaborators].sort((a, b) => {
          return rank[a.role] - rank[b.role];
      }).map(collab => {
          // Join with full User details if available in global list
          const details = availableUsers.find(u => u.id === collab.userId);
          return { ...collab, ...details };
      });
  };

  const sortedCollaborators = getSortedCollaborators();

  const getRoleIcon = (role: ProjectRole) => {
      if (role === 'owner') return <Crown className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500/20" />;
      if (role === 'viewer') return <Eye className="w-2.5 h-2.5 text-neural-400" />;
      return null; // Editor is default
  };

  const handleOpenInvite = () => {
      setIsSidebarOpen(true);
      setSidebarTab('team');
      addToast('info', "Invite members in the sidebar");
  };

  return (
    <div 
        className={`flex h-screen w-screen text-neural-100 overflow-hidden font-sans ${connectingNodeId ? 'cursor-crosshair' : ''}`}
        style={{ ...bgStyle }}
    >
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Live Session Overlay */}
      {isLiveMode && (
          <LiveSessionOverlay mode={mode} onClose={handleLiveSessionClose} />
      )}
      
      {/* Sidebar (Fixed Left) */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'} shadow-2xl md:relative md:transform-none border-r border-white/5 bg-neural-950`}>
        <Sidebar 
            mode={mode} 
            // Removed onModeChange
            onAddNode={handleAddNode} 
            nodes={nodes}
            users={availableUsers}
            collaborators={project.collaborators} // Pass collaborators
            onInviteUser={() => addToast('info', "Invite sent")}
            onClose={() => setIsSidebarOpen(false)}
            isMobile={isMobile}
            chatSessions={chatSessions}
            currentChatId={currentChatId}
            onNewChat={handleNewChat}
            onSelectChat={setCurrentChatId}
            onDeleteChat={(id) => setChatSessions(prev => prev.filter(c => c.id !== id))}
            onBackToDashboard={onBack}
            onNewProject={onCreateNewProject}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            versions={versions}
            onCreateVersion={handleCreateVersion}
            onRestoreVersion={handleRestoreVersion}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-full min-w-0">
         
         {/* Top Header Bar */}
         <div className="h-14 border-b border-white/5 bg-neural-900/80 backdrop-blur-md flex items-center justify-between px-4 z-40 shrink-0 relative">
            <div className="flex items-center gap-3">
               {!isSidebarOpen && (
                  <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-neural-400 hover:text-white rounded-lg transition-colors">
                      <Menu className="w-5 h-5" />
                  </button>
               )}
               <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Layout className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neural-500 leading-none mb-0.5">
                            <span>Neural Studio</span>
                            <span className="text-neural-700">/</span>
                            <span>{project.mode === AppMode.RESEARCHER ? 'Researcher' : 'Creator'}</span>
                        </div>
                        <h1 className="text-sm font-bold text-neural-100 leading-none">{project.title}</h1>
                    </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
               
               {/* Auto-Save / Save Status */}
               <div className="flex items-center gap-2 mr-2">
                   {unsavedChanges && !autoSave && (
                       <button onClick={handleManualSave} className="flex items-center gap-1 text-[10px] text-yellow-400 hover:text-white transition-colors animate-pulse">
                           <Save className="w-3 h-3" /> Save Now
                       </button>
                   )}
                   <div 
                     className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors ${autoSave ? 'text-green-400 hover:bg-green-500/10' : 'text-neural-500 hover:text-white hover:bg-white/10'}`}
                     onClick={toggleAutoSave}
                     title={autoSave ? "Auto-Save On" : "Auto-Save Off"}
                   >
                       {autoSave ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
                       <span className="text-[10px] uppercase font-bold hidden sm:inline">{autoSave ? 'Auto' : 'Manual'}</span>
                   </div>
               </div>

               <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

               {/* Industry Standard Collaborators Stack */}
               <div className="flex items-center mr-2">
                   {sortedCollaborators.map((user, index) => (
                       <div 
                         key={user.userId} 
                         onClick={() => handleFlyToUser(user.userId)}
                         className="relative -ml-2 first:ml-0 group cursor-pointer transition-transform hover:-translate-y-1 hover:z-20 z-0"
                       >
                           {/* Avatar */}
                           <div className={`relative w-8 h-8 rounded-full border-2 border-neural-900 overflow-hidden ${currentUser.id === user.userId ? 'ring-2 ring-indigo-500/50' : ''}`}>
                               {user.avatarUrl ? (
                                   <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.name || 'User'} />
                               ) : (
                                   <div className="w-full h-full bg-neural-700 flex items-center justify-center text-[10px]">{user.userId.substring(0,2)}</div>
                               )}
                           </div>
                           
                           {/* Role Badge (Small Icon Overlay) */}
                           {user.role !== 'editor' && (
                               <div className="absolute -bottom-0.5 -right-0.5 bg-neural-800 rounded-full p-[2px] border border-neural-900 shadow-sm z-10">
                                   {getRoleIcon(user.role)}
                               </div>
                           )}

                           {/* Tooltip */}
                           <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-white/10">
                               <span className="font-semibold">{user.name || 'Unknown'}</span>
                               <span className="opacity-50 mx-1">•</span>
                               <span className="capitalize opacity-80">{user.role}</span>
                           </div>
                       </div>
                   ))}

                   {/* Add Button */}
                   <button 
                      onClick={handleOpenInvite}
                      className="relative -ml-2 w-8 h-8 rounded-full bg-neural-800 border-2 border-neural-900 flex items-center justify-center text-neural-400 hover:text-white hover:bg-neural-700 hover:z-10 transition-all z-0"
                      title="Add Teammate"
                   >
                       <Plus className="w-4 h-4" />
                   </button>
               </div>

               {/* Share Button (Standard Invitation Flow) */}
               <button 
                  onClick={handleOpenInvite} 
                  className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-900/20"
               >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
               </button>

               <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

               <div className="flex items-center gap-2">
                   {/* Live Button */}
                    <button 
                        onClick={() => setIsLiveMode(true)} 
                        className={`p-2 rounded-lg border transition-all bg-neural-800 text-neural-400 border-white/10 hover:text-white hover:bg-white/10`}
                        title="Start Live Session"
                    >
                        <PanelRightOpen className="w-4 h-4 rotate-180" /> 
                        {/* Using rotate to simulate a "Live" icon distinct from Studio panel, or could import Activity */}
                    </button>

                    {/* Studio Toggle */}
                    <button 
                        onClick={() => setIsStudioOpen(!isStudioOpen)} 
                        className={`p-2 rounded-lg border transition-all ${isStudioOpen ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-neural-800 text-neural-400 border-white/10 hover:text-white'}`}
                        title="Toggle Studio Panel"
                    >
                        <PanelRightOpen className="w-4 h-4" />
                    </button>
               </div>
            </div>
         </div>

         {/* Canvas Area */}
         <div className="flex-1 relative overflow-hidden">
            {/* Note: ChatOverlay Live Button is now redundant if we have header button, but kept for overlay access */}
            <ChatOverlay 
                onSendMessage={handleSendMessage}
                history={chatHistory}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                mode={mode}
                hasSelection={selectedNodeIds.length > 0}
                onSaveToCanvas={handleSaveToCanvas}
                suggestions={currentSuggestions || []} 
                users={availableUsers}
                currentUser={currentUser}
                onShareToTeam={handleShareToTeam}
                sessionId={currentChatId} // Pass current ID to auto-open
            />

            <Canvas 
                nodes={nodes} 
                onNodesChange={setNodes} 
                selectedNodeIds={selectedNodeIds}
                onSelectionChange={setSelectedNodeIds}
                mode={mode}
                connectingNodeId={connectingNodeId}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                users={availableUsers}
                currentUser={currentUser}
                focusPoint={focusPoint}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyPast.length > 0}
                canRedo={historyFuture.length > 0}
                onNodeDragStart={saveHistory}
                onNodeDrop={handleNodeDrop} // Pass handleNodeDrop
                onGenerateImage={handleGenerateImage}
                onNodeResize={handleNodeResize}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
            />

            <TeamChatWidget 
              messages={teamMessages}
              onSendMessage={handleSendTeamMessage}
              currentUser={currentUser}
              users={availableUsers}
              onViewSession={setCurrentChatId}
            />
         </div>
      </div>

      {/* Studio Panel (Right Side) */}
      {isStudioOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-[360px] shadow-2xl md:relative border-l border-white/5">
            <StudioPanel mode={mode} results={studioResults} onRunStudioTask={handleRunStudioTask} onClose={() => setIsStudioOpen(false)} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  );
};
