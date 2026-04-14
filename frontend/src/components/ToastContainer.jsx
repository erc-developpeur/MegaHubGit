import React from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function ToastContainer() {
  const { toasts, dispatch } = useApp();

  if (!toasts.length) return null;

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠',
  };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontSize: 14 }}>{icons[t.type] || 'ℹ'}</span>
          <span style={{ flex: 1 }}>{t.msg}</span>
          <button
            onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: t.id })}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 0 0 8px', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
