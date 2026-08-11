import React from 'react';

/**
 * Full-viewport spinner used while Firebase resolves auth state and while
 * route-level lazy chunks download. Matches the dark login/splash background.
 */
const FullScreenLoader = ({ label }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      background: 'linear-gradient(135deg, #050308 0%, #0D0A1A 50%, #070510 100%)',
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        border: '3px solid rgba(108,60,240,0.2)',
        borderTopColor: '#6C3CF0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    {label && (
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 500, margin: 0 }}>
        {label}
      </p>
    )}
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default FullScreenLoader;
