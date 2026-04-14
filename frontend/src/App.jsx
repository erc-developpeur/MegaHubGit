import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import Following from './pages/Following.jsx';
import GitPanel from './pages/GitPanel.jsx';
import Settings from './pages/Settings.jsx';
import Planner from './pages/Planner.jsx';

export default function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/projects"  element={<Projects />}  />
          <Route path="/following" element={<Following />} />
          <Route path="/git"       element={<GitPanel />}  />
          <Route path="/planner"   element={<Planner />}  />
          <Route path="/settings" element={<Settings />}  />
        </Routes>
      </div>
      <ToastContainer />
    </div>
  );
}
