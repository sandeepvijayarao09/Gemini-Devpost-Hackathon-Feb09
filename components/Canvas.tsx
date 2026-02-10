
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { CanvasNode, AppMode, NodeType, User } from '../types';
import { NodeItem } from './NodeItem';
import { Minus, Plus, Maximize, RotateCcw, Undo, Redo, MousePointer2 } from 'lucide-react';

interface CanvasProps {
  nodes: CanvasNode[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  selectedNodeIds: string[];
  onSelectionChange: (ids: string[]) => void;
  mode: AppMode;
  connectingNodeId: string | null;
  onConnectStart: (id: string) => void;
  onConnectEnd: (id: string) => void;
  users?: User[]; // Pass available users
  currentUser?: User;
  focusPoint: {x: number, y: number} | null; // For flying to a location
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onNodeDragStart: () => void; // Trigger history save on drag start
  onNodeDrop?: (type: NodeType, content: string, title: string, position: {x: number, y: number}) => void;
  onGenerateImage?: (id: string) => void;
  onNodeResize: (id: string, width: number, height: number) => void;
  onAddComment?: (id: string, content: string) => void;
  onDeleteComment?: (id: string, commentId: string) => void;
}

interface Connection {
  start: CanvasNode;
  end: CanvasNode;
  type: 'implicit' | 'explicit';
}

export const Canvas: React.FC<CanvasProps> = ({ 
  nodes, 
  onNodesChange, 
  selectedNodeIds,
  onSelectionChange,
  mode,
  connectingNodeId,
  onConnectStart,
  onConnectEnd,
  users = [],
  currentUser,
  focusPoint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onNodeDragStart,
  onNodeDrop,
  onGenerateImage,
  onNodeResize,
  onAddComment,
  onDeleteComment
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  // Track mouse position in canvas coordinates for the visual connection line
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

  // Simulated Remote Cursors (Visual Effect)
  const [remoteCursors, setRemoteCursors] = useState<Record<string, {x: number, y: number}>>({});

  // Effect: Fly to Focus Point
  useEffect(() => {
    if (focusPoint && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate Pan to center the focusPoint
        // ScreenCenter = (WorldPoint * Zoom) + Pan
        // Pan = ScreenCenter - (WorldPoint * Zoom)
        const newPanX = centerX - (focusPoint.x * zoom);
        const newPanY = centerY - (focusPoint.y * zoom);

        setPan({ x: newPanX, y: newPanY });
    }
  }, [focusPoint, zoom]);

  // Effect: Simulate Remote Cursors Movement
  useEffect(() => {
    if (!users || users.length <= 1) return;

    const interval = setInterval(() => {
        const time = Date.now() / 1000;
        const newCursors: Record<string, {x: number, y: number}> = {};

        users.forEach((u, i) => {
            if (u.id === currentUser?.id) return; // Don't simulate self

            // Find their last node or use a default
            const userNodes = nodes.filter(n => n.ownerId === u.id);
            const center = userNodes.length > 0 
                ? userNodes[userNodes.length - 1].position 
                : { x: 400 + (i*300), y: 300 };

            // Orbit gently around their work area
            newCursors[u.id] = {
                x: center.x + Math.sin(time + i) * 150,
                y: center.y + Math.cos(time * 0.8 + i) * 100
            };
        });
        setRemoteCursors(newCursors);
    }, 50);

    return () => clearInterval(interval);
  }, [users, currentUser, nodes]);

  // Zoom Helpers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.1));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  // Calculate connections
  const connections = useMemo(() => {
    const lines: Connection[] = [];
    if (mode === AppMode.RESEARCHER) {
      const relevantNodes = nodes.filter(n => n.type === NodeType.FILE || n.type === NodeType.LINK || n.type === NodeType.VIDEO);
      for (let i = 0; i < relevantNodes.length; i++) {
        for (let j = i + 1; j < relevantNodes.length; j++) {
          lines.push({
            start: relevantNodes[i],
            end: relevantNodes[j],
            type: 'implicit'
          });
        }
      }
    }
    nodes.forEach(node => {
      if (node.parentIds && node.parentIds.length > 0) {
        node.parentIds.forEach(parentId => {
          if (parentId === node.id) return;
          const parent = nodes.find(n => n.id === parentId);
          if (parent) {
            lines.push({ start: parent, end: node, type: 'explicit' });
          }
        });
      }
    });
    return lines;
  }, [nodes, mode]);

  const handleUpdateNodePosition = (id: string, x: number, y: number) => {
    const updatedNodes = nodes.map(n => 
      n.id === id ? { ...n, position: { x, y } } : n
    );
    onNodesChange(updatedNodes);
  };

  const handleDeleteNode = (id: string) => {
    onNodesChange(nodes.filter(n => n.id !== id));
    onSelectionChange(selectedNodeIds.filter(sid => sid !== id));
  };

  const handleContentChange = (id: string, content: string) => {
    const updatedNodes = nodes.map(n => 
        n.id === id ? { ...n, content } : n
      );
      onNodesChange(updatedNodes);
  }

  // --- MOUSE HANDLERS ---
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current && !connectingNodeId) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectionChange([]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    // 1. Panning logic
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }

    // 2. Track cursor for connecting line (transform client coords to canvas coords)
    if (connectingNodeId) {
       const canvasX = (e.clientX - pan.x) / zoom;
       const canvasY = (e.clientY - pan.y) / zoom;
       setCursorPos({ x: canvasX, y: canvasY });
    }
  };

  const handleCanvasMouseUp = () => setIsPanning(false);

  // --- DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!onNodeDrop || !canvasRef.current) return;

    const raw = e.dataTransfer.getData('application/neural-node');
    if (!raw) return;

    try {
        const data = JSON.parse(raw);
        const rect = canvasRef.current.getBoundingClientRect();
        
        // Calculate World Coordinates: World = (Screen - Pan) / Zoom
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;

        // Center the node visually (approx width/2)
        const centeredX = worldX - 150; 
        const centeredY = worldY - 50;

        onNodeDrop(data.type, data.content, data.title, { x: centeredX, y: centeredY });
    } catch (err) {
        console.error("Drop failed", err);
    }
  };

  // --- TOUCH HANDLERS (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.target === canvasRef.current && !connectingNodeId && e.touches.length === 1) {
          setIsPanning(true);
          setStartPan({ 
              x: e.touches[0].clientX - pan.x, 
              y: e.touches[0].clientY - pan.y 
          });
          onSelectionChange([]);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      // 1. Panning
      if (isPanning && e.touches.length === 1) {
          e.preventDefault(); 
          setPan({
              x: e.touches[0].clientX - startPan.x,
              y: e.touches[0].clientY - startPan.y
          });
      }

      // 2. Connecting Line
      if (connectingNodeId && e.touches.length === 1) {
          const canvasX = (e.touches[0].clientX - pan.x) / zoom;
          const canvasY = (e.touches[0].clientY - pan.y) / zoom;
          setCursorPos({ x: canvasX, y: canvasY });
      }
  };

  const handleTouchEnd = () => setIsPanning(false);

  // --- WHEEL ZOOM ---
  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;

          // 1. Calculate Mouse Position relative to Canvas Top-Left
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const scaleAmount = -e.deltaY * 0.001;
          const newZoom = Math.min(Math.max(zoom + scaleAmount, 0.1), 3);
          
          // 2. Adjust Pan so the point under mouse remains stationary
          // Formula: newPan = mouse - (mouse - oldPan) * (newScale / oldScale)
          const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
          const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
          
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });

      } else {
          // Pan with scroll
          setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY });
      }
  };

  const handleNodeSelect = (id: string) => {
     if (connectingNodeId) {
       onConnectEnd(id);
       setCursorPos(null); // Clear cursor pos on connect
     } else {
       onSelectionChange([id]);
     }
  };

  const getNodeCenter = (node: CanvasNode) => {
     // If custom dimensions exist, use them
     if (node.width && node.height) {
         return { x: node.position.x + node.width / 2, y: node.position.y + node.height / 2 };
     }

     const isText = node.type === NodeType.TEXT;
     const width = isText ? 300 : (node.type === NodeType.FILE && node.mimeType?.startsWith('image/') && node.data) ? 240 : 220;
     const height = isText ? 120 : (node.type === NodeType.FILE && node.mimeType?.startsWith('image/') && node.data) ? 160 : 100; 
     return { x: node.position.x + width / 2, y: node.position.y + height / 2 }
  };

  // Helper to generate Bezier Curve Path
  const getBezierPath = (start: {x: number, y: number}, end: {x: number, y: number}) => {
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      const curvature = Math.min(dx * 0.5, 150);
      
      return `M ${start.x} ${start.y} C ${start.x + curvature} ${start.y}, ${end.x - curvature} ${end.y}, ${end.x} ${end.y}`;
  };

  // Helper to get connecting node center
  const connectingNode = connectingNodeId ? nodes.find(n => n.id === connectingNodeId) : null;
  const connectingStartPos = connectingNode ? getNodeCenter(connectingNode) : null;
  const isCreator = mode === AppMode.CREATOR;

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-neural-900"
    >
      <div 
        ref={canvasRef}
        className={`w-full h-full absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
            backgroundImage: isCreator 
                ? 'radial-gradient(circle at 1px 1px, #78716c 1px, transparent 0)' 
                : 'radial-gradient(circle at 1px 1px, #30363d 1px, transparent 0)',
            backgroundSize: `${32 * zoom}px ${32 * zoom}px`, // Scale grid visually
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            touchAction: 'none'
        }}
      >
        <div 
            className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
        >
            <svg className="absolute top-0 left-0 overflow-visible z-0" style={{ width: 1, height: 1 }}>
            <defs>
                {/* Researcher Gradient (Blue/Cyan) */}
                <linearGradient id="researcherGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
                </linearGradient>

                {/* Creator Gradient (Warm Stone/Orange) */}
                <linearGradient id="creatorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#78716c" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fdba74" stopOpacity="0.7" />
                </linearGradient>

                <marker id="arrowhead-research" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" opacity="0.6" />
                </marker>
                
                <marker id="arrowhead-creator" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#a8a29e" opacity="0.8" />
                </marker>
            </defs>

            {/* Existing Connections */}
            {connections.map((conn, idx) => {
                const start = getNodeCenter(conn.start);
                const end = getNodeCenter(conn.end);
                
                if (conn.type === 'explicit') {
                    return (
                    <path 
                        key={`explicit-${idx}`}
                        d={getBezierPath(start, end)}
                        stroke={isCreator ? "url(#creatorGradient)" : "url(#researcherGradient)"}
                        strokeWidth={isCreator ? "3" : "2"}
                        fill="none"
                        strokeOpacity={isCreator ? "0.6" : "0.6"}
                        markerEnd={isCreator ? "url(#arrowhead-creator)" : "url(#arrowhead-research)"}
                    />
                    )
                } else {
                    return (
                    <line 
                        key={`implicit-${idx}`}
                        x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                        stroke={isCreator ? "url(#creatorGradient)" : "url(#researcherGradient)"}
                        strokeWidth="1.5"
                        strokeDasharray="5,5"
                        strokeOpacity="0.3"
                    />
                    );
                }
            })}
            
            {/* Temporary Connection Line */}
            {connectingStartPos && cursorPos && (
                <path 
                    d={getBezierPath(connectingStartPos, cursorPos)}
                    stroke={isCreator ? "#fdba74" : "#22c55e"} 
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4,4"
                    strokeOpacity="0.8"
                    markerEnd={isCreator ? "url(#arrowhead-creator)" : "url(#arrowhead-research)"}
                />
            )}
            
            {connectingNodeId && cursorPos && (
                <text x={cursorPos.x + 10} y={cursorPos.y} fill="white" className="text-xs bg-black/50 px-1 rounded">Connecting...</text>
            )}
            </svg>

            <div className="pointer-events-auto relative w-full h-full z-10">
                {nodes.map(node => (
                <NodeItem 
                    key={node.id} 
                    node={node} 
                    scale={zoom}
                    onUpdatePosition={handleUpdateNodePosition}
                    onResize={onNodeResize}
                    onSelect={handleNodeSelect}
                    onDelete={handleDeleteNode}
                    onContentChange={handleContentChange}
                    selected={selectedNodeIds.includes(node.id)}
                    isConnecting={!!connectingNodeId}
                    onStartConnect={onConnectStart}
                    owner={users.find(u => u.id === node.ownerId)} // Pass owner
                    onDragStart={onNodeDragStart}
                    mode={mode}
                    onGenerateImage={onGenerateImage}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    users={users}
                />
                ))}

                {/* Simulated Remote Cursors */}
                {Object.entries(remoteCursors).map(([userId, pos]: [string, {x: number, y: number}]) => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;
                    return (
                        <div 
                            key={`cursor-${userId}`}
                            className="absolute pointer-events-none transition-transform duration-100 ease-linear z-50 flex items-start gap-1"
                            style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                        >
                            <MousePointer2 
                                className="w-5 h-5 fill-current" 
                                style={{ color: user.color }} 
                            />
                            <div 
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                                style={{ backgroundColor: user.color }}
                            >
                                {user.name}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-neural-800/90 backdrop-blur border border-neural-600 rounded-full shadow-2xl z-30">
         
         {/* Undo/Redo */}
         <button 
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 text-neural-400 hover:text-white hover:bg-neural-700 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)"
         >
             <Undo className="w-4 h-4" />
         </button>
         <button 
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 text-neural-400 hover:text-white hover:bg-neural-700 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Y)"
         >
             <Redo className="w-4 h-4" />
         </button>

         <div className="w-[1px] h-4 bg-neural-700 mx-1"></div>

         <button 
            onClick={handleZoomOut}
            className="p-2 text-neural-400 hover:text-white hover:bg-neural-700 rounded-full transition-colors"
            title="Zoom Out"
         >
             <Minus className="w-4 h-4" />
         </button>
         <div className="px-2 min-w-[3rem] text-center text-xs font-mono text-neural-300">
             {Math.round(zoom * 100)}%
         </div>
         <button 
            onClick={handleZoomIn}
            className="p-2 text-neural-400 hover:text-white hover:bg-neural-700 rounded-full transition-colors"
            title="Zoom In"
         >
             <Plus className="w-4 h-4" />
         </button>
         <div className="w-[1px] h-4 bg-neural-700 mx-1"></div>
         <button 
            onClick={handleReset}
            className="p-2 text-neural-400 hover:text-white hover:bg-neural-700 rounded-full transition-colors"
            title="Reset View"
         >
             <RotateCcw className="w-3.5 h-3.5" />
         </button>
      </div>
    </div>
  );
};
