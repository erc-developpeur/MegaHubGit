import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { projectsApi, githubApi } from '../api/index.js';

const AppContext = createContext(null);

const initial = {
  // Projects
  projects: [],
  projectsLoading: true,
  selectedProjectId: null,

  // GitHub user
  ghUser: null,
  ghConnected: false,
  ghLoading: true,

  // Toasts
  toasts: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, projectsLoading: false };
    case 'SET_PROJECTS_LOADING':
      return { ...state, projectsLoading: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'REMOVE_PROJECT':
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };
    case 'SELECT_PROJECT':
      return { ...state, selectedProjectId: action.payload };

    case 'SET_GH_USER':
      return { ...state, ghUser: action.payload, ghConnected: !!action.payload, ghLoading: false };
    case 'SET_GH_LOADING':
      return { ...state, ghLoading: action.payload };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: Date.now(), ...action.payload }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // ── Toast helpers ───────────────────────────────────────────
  const toast = useCallback((msg, type = 'info', duration = 4000) => {
    const id = Date.now();
    dispatch({ type: 'ADD_TOAST', payload: { id, msg, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
  }, []);

  // ── Load projects ───────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    try {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: true });
      const projects = await projectsApi.list();
      dispatch({ type: 'SET_PROJECTS', payload: projects });
    } catch (err) {
      dispatch({ type: 'SET_PROJECTS', payload: [] });
    }
  }, []);

  // ── Load GitHub user ────────────────────────────────────────
  const loadGhUser = useCallback(async () => {
    try {
      const user = await githubApi.me();
      dispatch({ type: 'SET_GH_USER', payload: user });
    } catch {
      dispatch({ type: 'SET_GH_USER', payload: null });
    }
  }, []);

  // ── Init ────────────────────────────────────────────────────
  useEffect(() => {
    loadProjects();
    loadGhUser();
  }, []);

  const value = {
    ...state,
    dispatch,
    toast,
    loadProjects,
    loadGhUser,
    selectedProject: state.projects.find(p => p.id === state.selectedProjectId) || null,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
