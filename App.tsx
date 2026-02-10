
import React, { useState } from 'react';
import { Project, AppMode, CanvasNode, ProjectRole } from './types';
import { MOCK_USERS, INITIAL_NODES } from './constants';
import { Dashboard } from './components/Dashboard';
import { Workspace } from './components/Workspace';

const App: React.FC = () => {
  // --- PROJECT STATE MANAGEMENT ---
  const [projects, setProjects] = useState<Project[]>([
      {
          id: 'p-default',
          title: 'Welcome Project',
          description: 'Introduction to Neural Studio functionality.',
          lastModified: Date.now(),
          mode: AppMode.RESEARCHER,
          nodes: INITIAL_NODES,
          chatSessions: [],
          previewNodeCount: 1,
          collaborators: [
              { userId: 'u1', role: 'owner' },
              { userId: 'u2', role: 'editor' },
              { userId: 'u3', role: 'viewer' }
          ],
          teamChat: [
            {
              id: 'tm-1',
              userId: 'u2',
              content: 'Hey! I added some initial research docs to the canvas.',
              timestamp: Date.now() - 1000000
            }
          ],
          versions: [],
          autoSave: true
      }
  ]);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Currently using the first mock user as "Me"
  const currentUser = MOCK_USERS[0];

  // --- ACTIONS ---

  const handleCreateProject = (title: string, description: string, mode: AppMode) => {
      const newProject: Project = {
          id: `p-${Date.now()}`,
          title,
          description,
          mode,
          lastModified: Date.now(),
          nodes: [],
          chatSessions: [],
          previewNodeCount: 0,
          collaborators: [{ userId: currentUser.id, role: 'owner' }],
          teamChat: [],
          versions: [],
          autoSave: true
      };
      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newProject.id); // Open immediately
  };

  const handleUpdateProject = (updatedProject: Project) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteProject = (id: string) => {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  // --- RENDER ---
  
  if (activeProjectId && activeProject) {
      return (
          <Workspace 
             key={activeProject.id} // Force re-mount on project switch
             project={activeProject}
             onSave={handleUpdateProject}
             onBack={() => setActiveProjectId(null)}
             currentUser={currentUser}
             availableUsers={MOCK_USERS}
             onCreateNewProject={handleCreateProject}
          />
      );
  }

  return (
      <Dashboard 
         projects={projects}
         onCreateProject={handleCreateProject}
         onOpenProject={setActiveProjectId}
         onDeleteProject={handleDeleteProject}
         currentUser={currentUser}
      />
  );
};

export default App;
