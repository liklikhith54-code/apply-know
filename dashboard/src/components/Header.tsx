import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Sparkles, User } from 'lucide-react';

interface HeaderProps {
  isDarkTheme: boolean;
  setIsDarkTheme: (dark: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkTheme, setIsDarkTheme }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sampleNotifications = [
    { id: 1, text: 'Sales target reached! (+18.4%)', time: '10m ago', unread: true },
    { id: 2, text: 'New project "HyperDrive" approved', time: '2h ago', unread: true },
    { id: 3, text: 'Server response times optimized', time: '1d ago', unread: false },
  ];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid var(--border-panel)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
      className="glass-panel"
    >
      {/* Search Input Widget */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-panel)',
          borderRadius: '12px',
          padding: '8px 16px',
          width: '320px',
          maxWidth: '100%'
        }}
      >
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search metrics, reports..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-title)',
            width: '100%',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)'
          }}
        />
      </div>

      {/* Control Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Sparkle Quick Action */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: 'var(--shadow-glow)'
          }}
          onClick={() => alert("Sparkle AI suggestions running...")}
        >
          <Sparkles size={16} />
          <span>AI Insight</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-panel)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-title)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-panel)'}
        >
          {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-panel)',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-title)',
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-panel)'}
          >
            <Bell size={20} />
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--accent-pink)',
                borderRadius: '50%',
                position: 'absolute',
                top: '10px',
                right: '10px',
                boxShadow: '0 0 8px var(--accent-pink)'
              }}
            />
          </button>

          {/* Notifications Modal Dropdown */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '320px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 100
              }}
              className="glass-panel"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-title)' }}>Notifications</span>
                <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', cursor: 'pointer' }}>Mark read</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sampleNotifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      background: n.unread ? 'rgba(0, 242, 254, 0.05)' : 'transparent',
                      fontSize: '13px',
                      borderLeft: n.unread ? '2px solid var(--accent-cyan)' : 'none'
                    }}
                  >
                    <div style={{ color: 'var(--text-title)', marginBottom: '4px' }}>{n.text}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Widget */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-panel)', paddingLeft: '20px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: '2px solid var(--border-panel)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}
          >
            <User size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-title)' }}>Admin Pilot</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lead Designer</span>
          </div>
        </div>

      </div>
    </header>
  );
};
