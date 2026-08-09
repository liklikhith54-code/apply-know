import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  CheckSquare, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Compass,
  Zap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'explore', label: 'Explore Map', icon: Compass },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div 
      style={{
        width: isCollapsed ? '80px' : '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-panel)',
        padding: '24px 16px',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowX: 'hidden',
      }}
      className="glass-panel"
    >
      {/* Sidebar Header Logo */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '40px',
          padding: '0 8px',
          position: 'relative'
        }}
      >
        <div 
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
            flexShrink: 0
          }}
        >
          <Zap size={22} color="white" />
        </div>
        {!isCollapsed && (
          <span 
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--text-title)',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap'
            }}
          >
            Aura<span className="text-glow-cyan">Sphere</span>
          </span>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '12px',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(0, 242, 254, 0.15) 0%, rgba(170, 48, 255, 0.05) 100%)' 
                  : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                color: isActive ? 'var(--text-title)' : 'var(--text-main)',
                textAlign: 'left',
                transition: 'var(--transition-fast)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = 'var(--text-title)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
            >
              <Icon 
                size={20} 
                style={{ 
                  color: isActive ? 'var(--accent-cyan)' : 'inherit',
                  transition: 'var(--transition-fast)',
                  flexShrink: 0
                }} 
              />
              {!isCollapsed && (
                <span style={{ fontSize: '15px', fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Trigger */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid var(--border-panel)',
          background: 'var(--bg-panel)',
          color: 'var(--text-main)',
          position: 'absolute',
          bottom: '24px',
          right: isCollapsed ? '24px' : '24px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          e.currentTarget.style.color = 'var(--text-title)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-panel)';
          e.currentTarget.style.color = 'var(--text-main)';
        }}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
};
