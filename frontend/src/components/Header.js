import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            VitalApp
          </Link>
          
          <nav className="nav">
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </nav>

          <div className="auth-buttons">
            {isAuthenticated ? (
              <div className="user-menu">
                <span className="welcome-text">Hello, {user.name}</span>
                <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
                <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/signin" className="btn btn-secondary">Sign In</Link>
                <Link to="/signup" className="btn btn-primary">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;