import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  Percent, 
  Cpu, 
  Database,
  ArrowUpRight
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend: string;
  trendType: 'up' | 'down';
  icon: React.ComponentType<any>;
  sparklineData: number[];
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  trend, 
  trendType, 
  icon: Icon, 
  sparklineData,
  color 
}) => {
  // Convert sparkline points into an SVG path
  const width = 100;
  const height = 30;
  const points = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * width;
    const y = height - (val / 100) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div 
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      className="glass-panel"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{title}</span>
        <div 
          style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '8px', 
            background: `rgba(${color}, 0.1)`, 
            color: `rgb(${color})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-title)' }}>{value}</span>
        <span 
          style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: trendType === 'up' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          {trendType === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend}
        </span>
      </div>

      {/* Sparkline Graph */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last 7 Days</span>
        <svg width={width} height={height}>
          <polyline
            fill="none"
            stroke={`rgb(${color})`}
            strokeWidth="2"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
};

export const DashboardView: React.FC = () => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; label: string; val: string } | null>(null);
  const [projectSearch, setProjectSearch] = useState('');

  // Sample data for main Area Chart
  const chartPoints = [
    { label: 'Jan', val: 12000, x: 20, y: 150 },
    { label: 'Feb', val: 18500, x: 100, y: 120 },
    { label: 'Mar', val: 15000, x: 180, y: 135 },
    { label: 'Apr', val: 24000, x: 260, y: 90 },
    { label: 'May', val: 22000, x: 340, y: 100 },
    { label: 'Jun', val: 32000, x: 420, y: 50 },
    { label: 'Jul', val: 28500, x: 500, y: 70 },
  ];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Find closest data point based on X value
    let closestIdx = 0;
    let minDiff = Infinity;
    chartPoints.forEach((pt, idx) => {
      const scaleX = (pt.x / 520) * rect.width;
      const diff = Math.abs(x - scaleX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const pt = chartPoints[closestIdx];
    setHoverIndex(closestIdx);
    
    // Calculate tooltip coordinates
    const scaleX = (pt.x / 520) * rect.width;
    const scaleY = (pt.y / 200) * rect.height;
    
    setTooltipData({
      x: scaleX,
      y: scaleY,
      label: pt.label,
      val: `$${pt.val.toLocaleString()}`
    });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setTooltipData(null);
  };

  const projects = [
    { id: 1, name: 'AuraSphere UI System', lead: 'Sarah Connor', status: 'Active', progress: 75, priority: 'High' },
    { id: 2, name: 'Smart RAG Connector', lead: 'Kyle Reese', status: 'Completed', progress: 100, priority: 'Critical' },
    { id: 3, name: 'Secure JWT Entitlements', lead: 'John Connor', status: 'Pending', progress: 20, priority: 'Medium' },
    { id: 4, name: 'Kubernetes Cloud Scaling', lead: 'T-800 Model', status: 'Blocked', progress: 45, priority: 'High' },
  ];

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.lead.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. KPIs Cards Row */}
      <div className="dashboard-grid">
        <MetricCard
          title="Monthly Income"
          value="$28,450"
          trend="+12.5%"
          trendType="up"
          icon={DollarSign}
          sparklineData={[30, 45, 35, 60, 50, 80, 90]}
          color="0, 242, 254" // Cyan RGB
        />
        <MetricCard
          title="Active Pilots"
          value="3,840"
          trend="+8.2%"
          trendType="up"
          icon={Users}
          sparklineData={[40, 30, 55, 48, 62, 70, 78]}
          color="170, 48, 255" // Purple RGB
        />
        <MetricCard
          title="System Load"
          value="42%"
          trend="-2.4%"
          trendType="down"
          icon={Activity}
          sparklineData={[60, 58, 52, 48, 44, 46, 42]}
          color="255, 0, 127" // Pink RGB
        />
        <MetricCard
          title="Conversion Rate"
          value="2.84%"
          trend="+18.4%"
          trendType="up"
          icon={Percent}
          sparklineData={[20, 22, 25, 23, 27, 28, 30]}
          color="16, 185, 129" // Green RGB
        />
      </div>

      {/* 2. Main Analytics & System dials */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px'
        }}
      >
        {/* Interactive Custom SVG Area Chart */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }} className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '18px' }}>Revenue Performance</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Interactive Area graph detailing monthly revenue</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ fontSize: '12px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>2026</span>
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '220px' }}>
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 540 200" 
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'crosshair', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--border-panel)" stopOpacity="0.1"/>
                  <stop offset="100%" stopColor="var(--border-panel)" stopOpacity="0.5"/>
                </linearGradient>
              </defs>

              {/* Horizontal gridlines */}
              <line x1="10" y1="50" x2="530" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="10" y1="100" x2="530" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="10" y1="150" x2="530" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Area SVG Path */}
              <path
                d={`M ${chartPoints[0].x} 200 
                    L ${chartPoints[0].x} ${chartPoints[0].y} 
                    Q 60 135 100 ${chartPoints[1].y} 
                    Q 140 127 180 ${chartPoints[2].y} 
                    Q 220 112 260 ${chartPoints[3].y} 
                    Q 300 95 340 ${chartPoints[4].y} 
                    Q 380 75 420 ${chartPoints[5].y} 
                    Q 460 60 500 ${chartPoints[6].y} 
                    L 500 200 Z`}
                fill="url(#chartGrad)"
              />

              {/* Line SVG Path */}
              <path
                d={`M ${chartPoints[0].x} ${chartPoints[0].y} 
                    Q 60 135 100 ${chartPoints[1].y} 
                    Q 140 127 180 ${chartPoints[2].y} 
                    Q 220 112 260 ${chartPoints[3].y} 
                    Q 300 95 340 ${chartPoints[4].y} 
                    Q 380 75 420 ${chartPoints[5].y} 
                    Q 460 60 500 ${chartPoints[6].y}`}
                fill="none"
                stroke="var(--accent-cyan)"
                strokeWidth="3"
                style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 242, 254, 0.4))' }}
              />

              {/* Reference vertical line on hover */}
              {hoverIndex !== null && tooltipData && (
                <line
                  x1={chartPoints[hoverIndex].x}
                  y1="10"
                  x2={chartPoints[hoverIndex].x}
                  y2="190"
                  stroke="rgba(0, 242, 254, 0.3)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Data points */}
              {chartPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === idx ? 6 : 4}
                  fill={hoverIndex === idx ? "var(--accent-purple)" : "var(--bg-app)"}
                  stroke="var(--accent-cyan)"
                  strokeWidth="2.5"
                  style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
                />
              ))}
            </svg>

            {/* Custom Tooltip Container Box */}
            {hoverIndex !== null && tooltipData && (
              <div
                style={{
                  position: 'absolute',
                  left: `${tooltipData.x}px`,
                  top: `${tooltipData.y - 65}px`,
                  background: 'var(--bg-panel)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--accent-cyan)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  boxShadow: 'var(--shadow-main)',
                  color: 'white',
                  pointerEvents: 'none',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 20
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{tooltipData.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{tooltipData.val}</span>
              </div>
            )}
          </div>
        </div>

        {/* System Health SVG progress dials */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }} className="glass-panel">
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '18px' }}>System Diagnostics</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Core utilization statuses</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
            {/* CPU Metric Dial */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
                  <circle 
                    cx="30" 
                    cy="30" 
                    r="24" 
                    fill="none" 
                    stroke="var(--accent-cyan)" 
                    strokeWidth="5"
                    strokeDasharray="150"
                    strokeDashoffset="78" // 48% progress
                    transform="rotate(-90 30 30)"
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-title)' }}>
                  48%
                </div>
              </div>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-title)' }}>
                  <Cpu size={14} color="var(--accent-cyan)" />
                  Processor Core
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>16 Threads | 4.2 GHz</div>
              </div>
            </div>

            {/* RAM Metric Dial */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
                  <circle 
                    cx="30" 
                    cy="30" 
                    r="24" 
                    fill="none" 
                    stroke="var(--accent-purple)" 
                    strokeWidth="5"
                    strokeDasharray="150"
                    strokeDashoffset="57" // 62% progress
                    transform="rotate(-90 30 30)"
                    strokeLinecap="round"
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-title)' }}>
                  62%
                </div>
              </div>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--text-title)' }}>
                  <Database size={14} color="var(--accent-purple)" />
                  Memory Pool
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>9.9 GB of 16 GB</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 3. Projects Table Grid */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-title)', fontSize: '18px' }}>Active Projects Space</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status overview of team project boards</span>
          </div>
          <input
            type="text"
            placeholder="Filter projects..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.1)',
              border: '1px solid var(--border-panel)',
              color: 'var(--text-title)',
              fontSize: '13px',
              outline: 'none',
              width: '200px'
            }}
          />
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-panel)', color: 'var(--text-muted)', fontSize: '12px' }}>
                <th style={{ padding: '12px 16px' }}>PROJECT</th>
                <th style={{ padding: '12px 16px' }}>LEAD</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px' }}>PRIORITY</th>
                <th style={{ padding: '12px 16px' }}>PROGRESS</th>
                <th style={{ padding: '12px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr 
                  key={p.id}
                  style={{ 
                    borderBottom: '1px solid var(--border-panel)', 
                    fontSize: '14px',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-title)' }}>{p.name}</td>
                  <td style={{ padding: '16px', color: 'var(--text-main)' }}>{p.lead}</td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: p.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                    (p.status === 'Active' ? 'rgba(0, 242, 254, 0.1)' : 
                                     (p.status === 'Blocked' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)')),
                        color: p.status === 'Completed' ? '#10b981' : 
                               (p.status === 'Active' ? 'var(--accent-cyan)' : 
                                (p.status === 'Blocked' ? '#ef4444' : '#f59e0b'))
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: p.priority === 'Critical' ? 'var(--accent-pink)' : 'inherit' }}>
                    {p.priority}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '120px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${p.progress}%`, 
                            height: '100%', 
                            background: p.progress === 100 ? '#10b981' : 'var(--accent-cyan)' 
                          }} 
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => alert(`Launching ${p.name}...`)}>
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
