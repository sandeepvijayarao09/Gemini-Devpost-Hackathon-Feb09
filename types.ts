
export enum AppMode {
  RESEARCHER = 'RESEARCHER',
  CREATOR = 'CREATOR'
}

export enum NodeType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  LINK = 'LINK',
  VIDEO = 'VIDEO'
}

export interface Position {
  x: number;
  y: number;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  content: string; // The text content for analysis (fallback or extracted text)
  data?: string;   // Base64 encoded data for binary files (PDF, MP4)
  mimeType?: string; // Mime type for the binary data
  url?: string; // For links/videos
  fileName?: string; // For files
  position: Position;
  width?: number; // Custom width
  height?: number; // Custom height
  selected?: boolean;
  parentIds?: string[]; // IDs of nodes that generated this node
  ownerId?: string; // ID of the user who owns this node
  comments?: Comment[];
}

export interface AnalysisResult {
  title: string;
  content: string; // Text content or Transcript
  audioData?: string; // Base64 Audio Data for Podcast
  type: 'report' | 'idea' | 'pattern' | 'audio';
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  color: string;
  cursor?: Position; // Track where the user is looking
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  userId?: string; // The specific user ID (if role is user)
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
  suggestedActions?: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  userId: string;
  role: ProjectRole;
}

export interface TeamMessage {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  attachment?: {
    type: 'session_share';
    sessionId: string;
    title: string;
    preview: string;
  };
}

export interface ProjectVersion {
  id: string;
  name: string;
  timestamp: number;
  createdBy: string;
  nodes: CanvasNode[];
  chatSessions: ChatSession[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  lastModified: number;
  mode: AppMode;
  nodes: CanvasNode[];
  chatSessions: ChatSession[];
  previewNodeCount: number;
  collaborators: Collaborator[];
  teamChat: TeamMessage[];
  versions: ProjectVersion[];
  autoSave: boolean;
}
