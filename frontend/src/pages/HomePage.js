import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserManager from '../components/UserManager';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Welcome to VitalApp</h1>
            <p>Your comprehensive multi-tenant SaaS solution with secure authentication, Google OAuth integration, and powerful multi-tenant CRUD operations.</p>
            {!isAuthenticated ? (
              <div className="hero-buttons">
                <Link to="/signup" className="btn btn-primary btn-large">Get Started</Link>
                <Link to="/signin" className="btn btn-secondary btn-large">Sign In</Link>
              </div>
            ) : (
              <div className="hero-buttons">
                <Link to="/dashboard" className="btn btn-primary btn-large">Go to Dashboard</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CRUD Operations Section - Main Feature */}
      <section className="crud-section">
        <div className="container">
          <div className="crud-header">
            <h2>🏢 Multi-Tenant SaaS User Management</h2>
            <p>Complete multi-tenant CRUD operations - Create tenants, assign users, and manage data across organizations</p>
          </div>

          {/* Multi-Tenant User Manager Component */}
          <UserManager />
        </div>
      </section>


      {/* Call to Action Section - Only show if not authenticated */}
      {!isAuthenticated && (
        <section className="cta">
          <div className="container">
            <div className="cta-content">
              <h2>Ready to Get Started?</h2>
              <p>Join thousands of users who trust VitalApp for their user management needs.</p>
              <Link to="/signup" className="btn btn-primary btn-large">Create Your Account</Link>
            </div>
          </div>
        </section>
      )}
      
    </div>
  );
};

export default HomePage;