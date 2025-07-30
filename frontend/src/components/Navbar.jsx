import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // We only need the useAuth hook
import { authService } from '../firebase/firebase';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout, loading } = useAuth(); // Get user, logout, and loading state from context
    const [menuOpen, setMenuOpen] = useState(false);

    // Determine if the user is an admin directly from the user object
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    const handleLogout = async () => {
        try {
            await authService.logout(); // Sign out from Firebase
            logout(); // Clear our application's auth state
            setMenuOpen(false);
            navigate('/login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Don't render anything until the auth state has been loaded
    if (loading) {
        return null;
    }

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <h1 className="logo">
                    <Link to="/home" className="logo-link">CyberSentinel</Link>
                </h1>
            </div>

            <div className="menu-toggle" onClick={toggleMenu}>
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
            </div>

            <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
                {!user ? (
                    <>
                        <Link to="/login" className="btn impact-btn" onClick={() => setMenuOpen(false)}>Login</Link>
                        <Link to="/signup" className="btn impact-btn" onClick={() => setMenuOpen(false)}>Signup</Link>
                    </>
                ) : (
                    <>
                        <Link to="/home" className="nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
                        <Link to="/assets" className="nav-link" onClick={() => setMenuOpen(false)}>Assets</Link>
                        <Link to="/risk-dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Risk Dashboard</Link>
                        <Link to="/compliance" className="nav-link" onClick={() => setMenuOpen(false)}>Compliance</Link>
                        <Link to="/report-incident" className="nav-link" onClick={() => setMenuOpen(false)}>Report Incident</Link>
                        <Link to="/subscription" className="nav-link" onClick={() => setMenuOpen(false)}>Subscription</Link>

                        {isAdmin && (
                            <>
                                <Link to="/admin/user-management" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>
                                    Admin Panel
                                </Link>
                                <Link to="/admin/waf-management" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>
                                    WAF Management
                                </Link>
                            </>
                        )}

                        <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
