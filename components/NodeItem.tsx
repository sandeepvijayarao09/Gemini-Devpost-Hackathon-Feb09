
import React, { useState, useRef, useEffect, memo } from 'react';
import { CanvasNode, NodeType, User, AppMode } from '../types';
import { 
  FileText, 
  Link as LinkIcon, 
  Video, 
  MessageSquare, 
  X, 
  File, 
  Globe, 
  FileSpreadsheet,
  Image as ImageIcon,
  PlayCircle,
  Link2,
  Mic,
  GripHorizontal,
  MoreHorizontal,
  ExternalLink,
  Sparkles,
  Search,
  Leaf,
  Box,
  Cpu,
  Layers,
  Wand2,
  Scaling,
  MessageCircle,
  Send,
  Trash2
} from 'lucide-react';

interface NodeItemProps {
  node: CanvasNode;
  scale: number;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  selected: boolean;
  isConnecting: boolean;
  onStartConnect: (id: string) => void;
  owner?: User;
  onDragStart?: () => void;
  mode: AppMode;
  onGenerateImage?: (id: string) => void;
  onAddComment?: (id: string, content: string) => void;
  onDeleteComment?: (id: string, commentId: string) => void;
  users?: User[];
}

export const NodeItem: React.FC<NodeItemProps> = memo(({ 
  node, 
  scale,
  onUpdatePosition, 
  onResize,
  onSelect, 
  onDelete, 
  onContentChange,
  selected,
  isConnecting,
  onStartConnect,
  owner,
  onDragStart,
  mode,
  onGenerateImage,
  onAddComment,
  onDeleteComment,
  users = []
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startW: number; startH: number } | null>(null);
  const [editedContent, setEditedContent] = useState(node.content);

  useEffect(() => {
    setEditedContent(node.content);
  }, [node.content]);

  // --- Visual Logic ---
  const isCreator = mode === AppMode.CREATOR;

  const getVisualConfig = () => {
    const name = (node.fileName || node.title).toLowerCase();
    
    let base;

    if (isCreator) {
        // CREATOR: Organic, Soft, Stone, Sans-serif, Rounded
        base = {
            shapeClass: 'rounded-3xl',
            gradient: 'from-stone-800/90 to-stone-900/90 backdrop-blur-md',
            border: 'border-stone-700/50 hover:border-orange-200/40',
            shadow: 'shadow-lg shadow-stone-950/20',
            headerBorder: 'border-stone-700/30',
            
            iconColor: 'text-stone-300',
            textColor: 'text-stone-100',
            metaColor: 'text-stone-500',
            
            titleFont: 'font-sans font-medium',
            contentFont: 'font-sans',
            Icon: Leaf,
            toolbarBg: 'bg-stone-800 border-stone-600',
            commentBg: 'bg-stone-900 border-stone-700'
        };
    } else {
        // RESEARCHER: Technical, Sharp, Slate, Mono, Boxy
        base = {
            shapeClass: 'rounded-md',
            gradient: 'from-slate-900 to-slate-950',
            border: 'border-slate-700 hover:border-sky-500/50',
            shadow: 'shadow-xl shadow-black/50',
            headerBorder: 'border-slate-800',
            
            iconColor: 'text-slate-400',
            textColor: 'text-slate-200',
            metaColor: 'text-slate-500',
            
            titleFont: 'font-mono font-semibold tracking-tight',
            contentFont: 'font-mono',
            Icon: Cpu,
            toolbarBg: 'bg-slate-800 border-slate-600',
            commentBg: 'bg-slate-900 border-slate-700'
        };
    }

    // TYPE OVERRIDES
    if (node.type === NodeType.TEXT) {
      if (isCreator) {
          return { 
              ...base, 
              gradient: 'from-stone-800 to-stone-800/95', 
              iconColor: 'text-emerald-200/80', 
              Icon: Sparkles 
          };
      } else {
          return { 
              ...base, 
              gradient: 'from-slate-800 to-slate-900', 
              iconColor: 'text-indigo-400', 
              Icon: MessageSquare 
          };
      }
    }

    // FILE EXTENSIONS
    if (name.endsWith('.pdf')) {
      return { ...base, iconColor: isCreator ? 'text-rose-300/80' : 'text-red-500', Icon: File };
    }
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return { ...base, iconColor: isCreator ? 'text-sky-300/80' : 'text-blue-500', Icon: FileText };
    }
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
      return { ...base, iconColor: isCreator ? 'text-emerald-300/80' : 'text-emerald-500', Icon: FileSpreadsheet };
    }
    if (name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) {
       return { ...base, iconColor: isCreator ? 'text-violet-300/80' : 'text-purple-500', Icon: ImageIcon }; 
    }
    if (name.endsWith('.webm') || name.endsWith('.mp3') || name.endsWith('.wav') || node.mimeType?.startsWith('audio/')) {
       return { ...base, iconColor: isCreator ? 'text-pink-300/80' : 'text-pink-500', Icon: Mic }; 
    }
    if (node.type === NodeType.VIDEO) {
      return { ...base, iconColor: isCreator ? 'text-orange-300/80' : 'text-red-500', Icon: PlayCircle };
    }
    if (node.type === NodeType.LINK) {
      return { ...base, iconColor: isCreator ? 'text-teal-300/80' : 'text-cyan-400', Icon: Globe };
    }

    return base;
  };

  const config = getVisualConfig();
  const IconComponent = config.Icon;
  const isImage = node.type === NodeType.FILE && node.mimeType?.startsWith('image/') && node.data;

  // Determine Dimensions
  const getDimensions = () => {
      // Use Custom Dimensions if set, otherwise defaults
      if (node.width && node.height) return { w: node.width, h: node.height };

      if (node.type === NodeType.TEXT) return { w: 300, h: 200 };
      if (isImage) return { w: 240, h: 240 }; // Image card
      return { w: 220, h: 100 }; // Standard file card
  };
  const dims = getDimensions();

  // --- Mouse Handlers for Dragging ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isConnecting || isResizing) return;
    
    // Allow text selection in textarea without dragging
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;

    e.stopPropagation();
    onSelect(node.id);
    
    if (onDragStart) onDragStart();

    setIsDragging(true);
    
    dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        nodeX: node.position.x,
        nodeY: node.position.y
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isConnecting || e.touches.length > 1 || isResizing) return;
    
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;

    e.stopPropagation();
    onSelect(node.id);

    if (onDragStart) onDragStart();

    setIsDragging(true);
    
    dragStartRef.current = {
        mouseX: e.touches[0].clientX,
        mouseY: e.touches[0].clientY,
        nodeX: node.position.x,
        nodeY: node.position.y
    };
  };

  // --- Resize Handlers ---
  const handleResizeStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!onResize) return;

      onSelect(node.id);
      setIsResizing(true);
      resizeStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          startW: dims.w,
          startH: dims.h as number
      };
      if (onDragStart) onDragStart(); // Save history state before resize
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Dragging Node
      if (isDragging && dragStartRef.current) {
        const dx = (e.clientX - dragStartRef.current.mouseX) / scale;
        const dy = (e.clientY - dragStartRef.current.mouseY) / scale;

        onUpdatePosition(
            node.id, 
            dragStartRef.current.nodeX + dx, 
            dragStartRef.current.nodeY + dy
        );
      }

      // 2. Resizing Node
      if (isResizing && resizeStartRef.current && onResize) {
        const dx = (e.clientX - resizeStartRef.current.mouseX) / scale;
        const dy = (e.clientY - resizeStartRef.current.mouseY) / scale;
        
        const newW = Math.max(150, resizeStartRef.current.startW + dx);
        const newH = Math.max(100, resizeStartRef.current.startH + dy);

        onResize(node.id, newW, newH);
      }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        dragStartRef.current = null;
        resizeStartRef.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging || !dragStartRef.current) return;
        e.preventDefault(); 
        
        const dx = (e.touches[0].clientX - dragStartRef.current.mouseX) / scale;
        const dy = (e.touches[0].clientY - dragStartRef.current.mouseY) / scale;

        onUpdatePosition(
            node.id, 
            dragStartRef.current.nodeX + dx, 
            dragStartRef.current.nodeY + dy
        );
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isResizing, node.id, onUpdatePosition, onResize, scale]);

  const handleCommentSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (newComment.trim() && onAddComment) {
          onAddComment(node.id, newComment);
          setNewComment('');
      }
  };

  return (
    <div
      ref={nodeRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onWheel={(e) => e.stopPropagation()} // Stop wheel propagation to prevent canvas pan
      style={{ 
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
        position: 'absolute',
        zIndex: selected || isDragging || isResizing || showComments ? 50 : 10,
        width: dims.w,
        height: dims.h,
        touchAction: 'none'
      }}
      className={`
        group flex flex-col transition-shadow duration-300
        ${config.shapeClass}
        bg-gradient-to-br ${config.gradient}
        border ${selected 
            ? (isCreator ? 'border-orange-200/40 ring-2 ring-orange-200/10 ring-offset-2 ring-offset-stone-900' : 'border-sky-500 ring-1 ring-sky-500/50 ring-offset-1 ring-offset-slate-900') 
            : `${config.border}`}
        ${config.shadow}
        ${isConnecting ? 'hover:ring-2 hover:ring-green-400 cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}
      `}
    >
      {/* --- Action Toolbar (Floating) --- */}
      <div 
        className={`
          absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 
          ${config.toolbarBg} border rounded-full shadow-2xl backdrop-blur-md 
          transition-all duration-200 
          ${selected || isDragging || showComments ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}
        `}
      >
        {!isConnecting && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(node.id);
            }}
            onTouchEnd={(e) => {
                e.stopPropagation();
                onStartConnect(node.id);
            }}
            className="p-2.5 text-neural-400 hover:text-green-400 hover:bg-black/20 rounded-full transition-colors"
            title="Connect"
          >
            <Link2 className="w-5 h-5" />
          </button>
        )}

        {/* MAGIC WAND: Generate Image (Creator Mode Only, Text Node) */}
        {isCreator && node.type === NodeType.TEXT && onGenerateImage && (
            <>
            <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onGenerateImage(node.id);
                }}
                className="p-2.5 text-neural-400 hover:text-orange-400 hover:bg-black/20 rounded-full transition-colors flex items-center justify-center animate-pulse hover:animate-none"
                title="Visualize (AI Image)"
            >
                <Wand2 className="w-5 h-5" />
            </button>
            </>
        )}

        {/* EXTERNAL LINK BUTTON for Links/Videos */}
        {(node.type === NodeType.LINK || node.type === NodeType.VIDEO) && node.url && (
            <>
            <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
            <a 
                href={node.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 text-neural-400 hover:text-blue-400 hover:bg-black/20 rounded-full transition-colors flex items-center justify-center"
                title="Open Link"
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
            >
                <ExternalLink className="w-5 h-5" />
            </a>
            </>
        )}

        {/* Comments Toggle */}
        <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(!showComments);
          }}
          className={`p-2.5 hover:bg-black/20 rounded-full transition-colors flex items-center gap-1 ${showComments ? 'text-white bg-black/30' : 'text-neural-400 hover:text-white'}`}
          title="Comments"
        >
          <MessageCircle className="w-5 h-5" />
          {node.comments && node.comments.length > 0 && (
             <span className="text-[9px] font-bold bg-neural-700 px-1 rounded-full">{node.comments.length}</span>
          )}
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-1"></div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          onTouchEnd={(e) => {
              e.stopPropagation();
              onDelete(node.id);
          }}
          className="p-2.5 text-neural-400 hover:text-red-400 hover:bg-black/20 rounded-full transition-colors"
          title="Remove"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* --- Comments Panel --- */}
      {showComments && (
          <div 
             className={`absolute top-full mt-2 left-0 w-64 p-3 rounded-lg border shadow-2xl backdrop-blur-md cursor-default z-50 ${config.commentBg} animate-in fade-in zoom-in-95 duration-200`}
             onMouseDown={(e) => e.stopPropagation()}
             onWheel={(e) => e.stopPropagation()} // Allow scrolling inside comments without panning
          >
              <div className="max-h-48 overflow-y-auto space-y-3 mb-3 pr-1 scrollbar-thin scrollbar-thumb-neural-600">
                  {(!node.comments || node.comments.length === 0) && (
                      <p className="text-xs text-neural-500 text-center py-2">No comments yet.</p>
                  )}
                  {node.comments?.map(comment => {
                      const user = users.find(u => u.id === comment.userId) || { name: 'Unknown', avatarUrl: '' };
                      return (
                          <div key={comment.id} className="flex gap-2 items-start group/comment">
                              <img src={user.avatarUrl} className="w-5 h-5 rounded-full mt-0.5" alt={user.name} />
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] font-bold text-neural-300">{user.name}</span>
                                    <span className="text-[9px] text-neural-600">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <p className="text-xs text-neural-200 break-words leading-tight">{comment.content}</p>
                              </div>
                              {onDeleteComment && (
                                <button onClick={() => onDeleteComment(node.id, comment.id)} className="opacity-0 group-hover/comment:opacity-100 text-neural-600 hover:text-red-400">
                                   <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                          </div>
                      );
                  })}
              </div>
              
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input 
                      className="flex-1 bg-neural-950/50 border border-neural-700 rounded text-xs px-2 py-1.5 text-white placeholder-neural-500 focus:outline-none focus:border-neural-500"
                      placeholder="Add comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" disabled={!newComment.trim()} className="p-1.5 bg-neural-800 hover:bg-neural-700 text-neural-300 rounded border border-neural-700 disabled:opacity-50">
                      <Send className="w-3 h-3" />
                  </button>
              </form>
          </div>
      )}

      {/* --- Owner Badge --- */}
      {owner && (
        <div className={`absolute -bottom-3 -right-2 z-30 flex items-center rounded-full p-0.5 border shadow-sm ${isCreator ? 'bg-stone-800 border-stone-600' : 'bg-slate-800 border-slate-600'}`} title={`Created by ${owner.name}`}>
          <img 
            src={owner.avatarUrl} 
            alt={owner.name} 
            className="w-5 h-5 rounded-full"
          />
        </div>
      )}

      {/* --- Node Content --- */}
      
      {/* 1. TEXT NODE */}
      {node.type === NodeType.TEXT && (
         <div className="flex flex-col h-full relative">
            <div className={`flex items-center justify-between p-3 border-b ${config.headerBorder} cursor-grab active:cursor-grabbing shrink-0`}>
                <div className={`flex items-center gap-2 ${config.textColor}`}>
                    <IconComponent className={`w-4 h-4 ${config.iconColor}`} />
                    <span className={`text-xs ${config.titleFont} truncate max-w-[150px]`}>{node.title}</span>
                </div>
                <GripHorizontal className={`w-4 h-4 ${isCreator ? 'text-stone-600' : 'text-slate-600'}`} />
            </div>
            <textarea
                className={`w-full h-full bg-transparent p-4 text-sm resize-none focus:outline-none leading-relaxed overflow-y-auto ${isCreator ? 'rounded-b-3xl' : 'rounded-b-lg'} ${config.contentFont} ${isCreator ? 'text-stone-200 placeholder-stone-600' : 'text-slate-200 placeholder-slate-600'}`}
                value={editedContent}
                onChange={(e) => {
                    setEditedContent(e.target.value);
                    onContentChange(node.id, e.target.value);
                }}
                placeholder="Write a thought..."
                onMouseDown={(e) => e.stopPropagation()} 
                onTouchStart={(e) => e.stopPropagation()} 
            />
         </div>
      )}

      {/* 2. IMAGE PREVIEW NODE */}
      {isImage && (
          <div className={`flex flex-col h-full overflow-hidden ${config.shapeClass}`}>
              <div className="relative w-full h-full bg-neural-950/50 group-hover:brightness-110 transition-all">
                  <img 
                    src={`data:${node.mimeType};base64,${node.data}`} 
                    className="w-full h-full object-cover select-none pointer-events-none"
                    alt={node.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neural-900/80 to-transparent opacity-60 pointer-events-none"></div>
                  <div className="absolute bottom-2 left-3 right-3 pointer-events-none">
                      <p className={`text-xs font-medium text-white truncate shadow-black drop-shadow-md ${config.titleFont}`}>{node.title}</p>
                  </div>
                  <div className="absolute top-2 left-3 bg-black/40 backdrop-blur-md rounded-md px-1.5 py-0.5 border border-white/10 pointer-events-none">
                      <ImageIcon className="w-3 h-3 text-purple-400" />
                  </div>
              </div>
          </div>
      )}

      {/* 3. STANDARD FILE / LINK / VIDEO NODE */}
      {!isImage && node.type !== NodeType.TEXT && (
        <div className="flex flex-row items-center p-4 gap-4 h-full">
            <div className={`
                flex items-center justify-center w-12 h-12 shrink-0
                border shadow-inner
                ${isCreator ? 'rounded-2xl bg-stone-800/50 border-stone-600/20' : 'rounded-md bg-slate-800 border-slate-700'}
                ${config.iconColor}
            `}>
                <IconComponent className="w-6 h-6" strokeWidth={1.5} />
            </div>
            
            <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-xs truncate leading-tight mb-1 ${config.textColor} ${config.titleFont}`} title={node.title}>
                    {node.title}
                </span>
                <span className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${config.contentFont} ${config.metaColor}`}>
                    {node.fileName ? node.fileName.split('.').pop()?.toUpperCase() : node.type}
                    {node.url && <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-50"/>}
                </span>
            </div>
        </div>
      )}

      {/* RESIZE HANDLE */}
      <div 
        onMouseDown={handleResizeStart}
        className={`absolute bottom-0 right-0 w-6 h-6 z-50 cursor-se-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity`}
      >
          <div className="w-2 h-2 border-r-2 border-b-2 border-neural-500"></div>
      </div>

      {/* Selection Ring Animation */}
      {selected && (
          <div className={`absolute -inset-[2px] ${config.shapeClass} border animate-pulse pointer-events-none ${isCreator ? 'border-orange-100/30' : 'border-sky-500/30'}`}></div>
      )}
    </div>
  );
});
