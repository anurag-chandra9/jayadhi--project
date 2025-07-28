// frontend/src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../firebase/firebase';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // Get user, isLoggedIn, loading, and NEW: userClaims from AuthContext
    const { user, isLoggedIn, loading, userClaims } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);

    // NEW: Determine isAdmin directly from userClaims
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        console.log("Navbar useEffect triggered.");
        console.log("Current auth loading:", loading);
        console.log("Current user object:", user);
        console.log("Current userClaims object:", userClaims); // NEW LOG
        console.log("Is logged in (from context):", isLoggedIn);

        if (!loading && user) {
            // FIX: Read role directly from userClaims provided by context
            const userRole = userClaims?.role || 'user';
            console.log("Navbar: Role from userClaims:", userRole); // NEW LOG
            setIsAdmin(userRole === 'admin');
            console.log("Navbar: isAdmin state set to:", (userRole === 'admin'));
        } else if (!loading && !user) {
            console.log("Navbar: No user logged in. Setting isAdmin to false.");
            setIsAdmin(false);
        }
    }, [user, loading, isLoggedIn, userClaims]); // Added userClaims to dependency array

    const handleLogout = async () => {
        try {
            await authService.logout();
            localStorage.removeItem('token');
            setMenuOpen(false);
            navigate('/login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    if (loading) {
        console.log("Navbar: Still loading auth state...");
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
                {!isLoggedIn ? (
                    <>
                        <Link to="/login" className="btn impact-btn" onClick={() => setMenuOpen(false)}>Login</Link>
                        <Link to="/signup" className="btn impact-btn" onClick={() => setMenuOpen(false)}>Signup</Link>
                    </>
                ) : (
                    <>
                        <Link to="/home" className="nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
                        <Link to="/assets" className="nav-link" onClick={() => setMenuOpen(false)}>Assets</Link>
                        <Link to="/risk-dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Risk Dashboard</Link>
                        <Link to="/report-incident" className="nav-link" onClick={() => setMenuOpen(false)}>Report Incident</Link>
                        <Link to="/subscription" className="nav-link" onClick={() => setMenuOpen(false)}>Subscription</Link>

                        {isAdmin && (
                            <Link to="/admin/user-management" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>
                                Admin Panel
                            </Link>
                        )}
                        {/* === NEW: Admin WAF Management Link (conditionally rendered) === */}
                        {isAdmin && (
                            <Link to="/admin/waf-management" className="nav-link admin-link" onClick={() => setMenuOpen(false)}>
                                WAF Management
                            </Link>
                        )}


                        <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;