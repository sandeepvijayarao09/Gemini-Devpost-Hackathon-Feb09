
export const GEMINI_RESEARCHER_MODEL = 'gemini-3-pro-preview';
export const GEMINI_CREATOR_MODEL = 'gemini-3-flash-preview';

export const AVAILABLE_MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', description: 'Complex reasoning & analysis' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash', description: 'High speed & efficiency' },
];

export const MOCK_USERS = [
  { id: 'u1', name: 'You', avatarUrl: 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff', color: '#0D8ABC' },
  { id: 'u2', name: 'Sarah', avatarUrl: 'https://ui-avatars.com/api/?name=Sarah&background=6b21a8&color=fff', color: '#6b21a8' },
  { id: 'u3', name: 'Alex', avatarUrl: 'https://ui-avatars.com/api/?name=Alex&background=059669&color=fff', color: '#059669' },
];

export const INITIAL_NODES = [
  {
    id: 'welcome-node',
    type: 'TEXT',
    title: 'Welcome to Neural Studio',
    content: 'This is an AI-first canvas. \n\n1. Switch modes in the sidebar.\n2. Drag files here to analyze.\n3. Connect ideas to spark creativity.',
    position: { x: 100, y: 100 },
    ownerId: 'u1'
  }
] as any;
