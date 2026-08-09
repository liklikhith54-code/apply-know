import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TasksWidget } from './components/TasksWidget';
import { Compass, AlertCircle, RefreshCw } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Sync theme changes with body class
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
    }
  }, [isDarkTheme]);

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'tasks':
        return <TasksWidget />;
      case 'analytics':
        return (
          <div style={{ padding: '24px' }} className="glass-panel">
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px' }}>Deep Analytics Space</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Advanced forecasting & reporting datasets</span>
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={40} style={{ marginBottom: '16px', color: 'var(--accent-cyan)' }} />
              <p>Analytics computations are syncing. Check monthly graphs on the main dashboard tab.</p>
            </div>
          </div>
        );
      case 'explore':
        return (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }} className="glass-panel">
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px' }}>Spatial Intelligence platform</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Synchronized with MapSphere GIS Server</span>
            </div>
            
            <div 
              style={{ 
                padding: '40px', 
                textAlign: 'center', 
                border: '2px dashed var(--border-panel)', 
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.1)'
              }}
            >
              <Compass size={48} className="pulse-glow" style={{ marginBottom: '20px', color: 'var(--accent-cyan)', borderRadius: '50%', padding: '10px' }} />
              <h4 style={{ color: 'var(--text-title)', margin: '0 0 10px 0', fontSize: '18px' }}>Active GIS Session Discovered</h4>
              <p style={{ maxWidth: '500px', margin: '0 auto 20px auto', fontSize: '14px', lineHeight: 1.5 }}>
                MapSphere interactive leaflet spatial markers, user sessions, and autocomplete suggestions are operational on backend port 8080.
              </p>
              <a 
                href="http://127.0.0.1:8080" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                Launch Leaflet GIS Map
              </a>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }} className="glass-panel">
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '20px' }}>Global Settings</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configure application preferences</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-panel)' }}>
                <div>
                  <div style={{ color: 'var(--text-title)', fontWeight: 600, fontSize: '14px' }}>Theme Preference</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Enable dark background optimization</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={isDarkTheme} 
                  onChange={() => setIsDarkTheme(!isDarkTheme)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-panel)' }}>
                <div>
                  <div style={{ color: 'var(--text-title)', fontWeight: 600, fontSize: '14px' }}>Telemetry Logs</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Forward diagnostics logs to Azure Application Insights</div>
                </div>
                <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-panel)' }}>
                <div>
                  <div style={{ color: 'var(--text-title)', fontWeight: 600, fontSize: '14px' }}>Sync Server Suggestion</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Reload cached assets from search indexes</div>
                </div>
                <button 
                  onClick={() => alert('Indexes synced successfully.')}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid var(--border-panel)', 
                    color: 'var(--text-title)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={12} />
                  Sync
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        transition: 'background-color 0.4s ease'
      }}
    >
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main dashboard content body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header isDarkTheme={isDarkTheme} setIsDarkTheme={setIsDarkTheme} />
        
        <main style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          {renderActiveContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
