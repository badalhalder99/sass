import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:3002/api';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch users from API for dashboard stats
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Calculate dashboard statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.email).length;
  const averageAge = users.length > 0 ? Math.round(users.reduce((sum, user) => sum + (parseInt(user.age) || 0), 0) / users.length) : 0;
  const topProfessions = [...new Set(users.map(u => u.profession).filter(Boolean))].slice(0, 3);

  return (
    <div className="modern-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-hero">
        <div className="container">
          <div className="hero-content">
            <div className="welcome-section">
              <div className="user-profile-large">
                <div className="avatar-large">
                  {user.avatar ? (
                    <img src={user.avatar} alt="User Avatar" />
                  ) : (
                    <div className="avatar-placeholder-large">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-info-large">
                  <h1>Welcome back, {user.firstName || user.name}!</h1>
                  <p className="user-role">Administrator Dashboard</p>
                  <p className="last-login">Last login: {currentTime.toLocaleString()}</p>
                </div>
              </div>
              <div className="quick-actions">
                <button onClick={logout} className="btn btn-outline">
                  <span>🚪</span> Logout
                </button>
                <button onClick={fetchUsers} className="btn btn-primary">
                  <span>🔄</span> Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-main">
        <div className="container">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card gradient-1">
              <div className="stat-header">
                <div className="stat-icon">👥</div>
                <h3>Total Users</h3>
              </div>
              <div className="stat-number">{totalUsers}</div>
              <div className="stat-change positive">
                <span>+12%</span> from last month
              </div>
            </div>

            <div className="stat-card gradient-2">
              <div className="stat-header">
                <div className="stat-icon">✅</div>
                <h3>Active Users</h3>
              </div>
              <div className="stat-number">{activeUsers}</div>
              <div className="stat-change positive">
                <span>+8%</span> from last month
              </div>
            </div>

            <div className="stat-card gradient-3">
              <div className="stat-header">
                <div className="stat-icon">📊</div>
                <h3>Average Age</h3>
              </div>
              <div className="stat-number">{averageAge}</div>
              <div className="stat-change neutral">
                <span>~</span> years old
              </div>
            </div>

            <div className="stat-card gradient-4">
              <div className="stat-header">
                <div className="stat-icon">💼</div>
                <h3>Professions</h3>
              </div>
              <div className="stat-number">{topProfessions.length}</div>
              <div className="stat-change positive">
                <span>+2</span> new categories
              </div>
            </div>
          </div>

          {/* Dashboard Content Grid */}
          <div className="dashboard-content-grid">
            {/* Recent Activity Widget */}
            <div className="dashboard-widget recent-activity-widget">
              <div className="widget-header">
                <h3>
                  <span className="widget-icon">⚡</span>
                  Recent Activity
                </h3>
                <button className="widget-action" onClick={fetchUsers}>
                  <span>🔄</span>
                </button>
              </div>
              <div className="widget-content">
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading recent activity...</p>
                  </div>
                ) : (
                  <div className="activity-timeline">
                    {users.slice(0, 6).map((user, index) => (
                      <div key={user._id} className="timeline-item">
                        <div className="timeline-marker">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="timeline-content">
                          <h4>{user.name}</h4>
                          <p>{user.profession || 'No profession'} • {user.age || 'Age not specified'}</p>
                          <span className="timeline-time">
                            {index === 0 ? 'Just now' : `${index * 2} hours ago`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Widget */}
            <div className="dashboard-widget quick-stats-widget">
              <div className="widget-header">
                <h3>
                  <span className="widget-icon">📈</span>
                  System Overview
                </h3>
              </div>
              <div className="widget-content">
                <div className="quick-stat-item">
                  <div className="quick-stat-label">System Status</div>
                  <div className="quick-stat-value status-online">Online</div>
                </div>
                <div className="quick-stat-item">
                  <div className="quick-stat-label">Server Uptime</div>
                  <div className="quick-stat-value">99.9%</div>
                </div>
                <div className="quick-stat-item">
                  <div className="quick-stat-label">Database Size</div>
                  <div className="quick-stat-value">{(totalUsers * 0.5).toFixed(1)} MB</div>
                </div>
                <div className="quick-stat-item">
                  <div className="quick-stat-label">Last Backup</div>
                  <div className="quick-stat-value">2 hours ago</div>
                </div>
              </div>
            </div>

            {/* Top Professions Widget */}
            <div className="dashboard-widget professions-widget">
              <div className="widget-header">
                <h3>
                  <span className="widget-icon">🏆</span>
                  Top Professions
                </h3>
              </div>
              <div className="widget-content">
                {topProfessions.length > 0 ? (
                  <div className="profession-chart">
                    {topProfessions.map((profession, index) => {
                      const count = users.filter(u => u.profession === profession).length;
                      const percentage = (count / totalUsers * 100).toFixed(1);
                      return (
                        <div key={profession} className="profession-bar">
                          <div className="profession-info">
                            <span className="profession-name">{profession}</span>
                            <span className="profession-count">{count} users</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{width: `${percentage}%`}}
                            ></div>
                          </div>
                          <span className="profession-percentage">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <p>No profession data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Metrics Widget */}
            <div className="dashboard-widget performance-widget">
              <div className="widget-header">
                <h3>
                  <span className="widget-icon">⚡</span>
                  Performance
                </h3>
              </div>
              <div className="widget-content">
                <div className="performance-metrics">
                  <div className="metric-circle">
                    <div className="circle-progress">
                      <svg viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#e6e6e6" strokeWidth="2"/>
                        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#667eea" strokeWidth="2"
                                strokeDasharray="85, 100" transform="rotate(-90 18 18)"/>
                      </svg>
                      <div className="circle-text">
                        <span className="circle-number">85%</span>
                        <span className="circle-label">Performance</span>
                      </div>
                    </div>
                  </div>
                  <div className="metric-list">
                    <div className="metric-item">
                      <span className="metric-dot green"></span>
                      <span>Response Time: 120ms</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-dot blue"></span>
                      <span>Memory Usage: 64%</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-dot orange"></span>
                      <span>CPU Usage: 23%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="quick-action-bar">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <a href="/" className="action-btn">
                <span className="action-icon">🏠</span>
                <div className="action-text">
                  <div className="action-title">Go to Homepage</div>
                  <div className="action-subtitle">Manage users with CRUD operations</div>
                </div>
              </a>
              <button className="action-btn" onClick={fetchUsers}>
                <span className="action-icon">📊</span>
                <div className="action-text">
                  <div className="action-title">Refresh Analytics</div>
                  <div className="action-subtitle">Update dashboard data</div>
                </div>
              </button>
              <button className="action-btn">
                <span className="action-icon">⚙️</span>
                <div className="action-text">
                  <div className="action-title">System Settings</div>
                  <div className="action-subtitle">Configure application</div>
                </div>
              </button>
              <button className="action-btn">
                <span className="action-icon">📈</span>
                <div className="action-text">
                  <div className="action-title">View Reports</div>
                  <div className="action-subtitle">Detailed analytics</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;