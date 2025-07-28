// frontend/src/components/AdminWAFManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../firebase/firebase';
import './AdminWAFManagement.css';

const AdminWAFManagement = () => {
    // FIX: Get userClaims directly from useAuth()
    const { user, isLoggedIn, loading, userClaims } = useAuth(); // Ensure userClaims is destructured

    const [blockedIPs, setBlockedIPs] = useState([]);
    const [fetchIPsLoading, setFetchIPsLoading] = useState(true);
    const [fetchIPsError, setFetchIPsError] = useState('');
    const [blockIpAddress, setBlockIpAddress] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // FIX: Determine isAdmin based on userClaims.role
    const userRole = userClaims?.role || 'user'; // Use userClaims directly here
    const isAdmin = userRole === 'admin'; // Check if the role is 'admin' (lowercase)

    // === FIX: Define fetchBlockedIPs using useCallback directly at the top level of the component ===
    const fetchBlockedIPs = useCallback(async () => {
        if (!isAdmin) { // Only fetch if user is determined to be admin
            setFetchIPsLoading(false);
            return;
        }
        setFetchIPsLoading(true);
        setFetchIPsError('');
        try {
            console.log("ADMIN_WAF_DEBUG: Admin detected. Attempting to fetch WAF data.");
            const response = await authService.makeAuthenticatedRequest('/waf/dashboard'); // This calls your backend wafController.js
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch WAF dashboard data.');
            }
            setBlockedIPs(data.blockedIPs || []);
            console.log("ADMIN_WAF_DEBUG: WAF data fetched successfully:", data);
        } catch (error) {
            console.error('ADMIN_WAF_ERROR: Error fetching blocked IPs for Admin WAF Management:', error);
            setFetchIPsError(`Failed to load blocked IPs: ${error.message || 'Unknown error'}`);
        } finally {
            setFetchIPsLoading(false);
        }
    }, [isAdmin]); // isAdmin is a dependency for fetchBlockedIPs


    // === useEffect now just calls the useCallback defined above ===
    useEffect(() => {
        console.log("ADMIN_WAF_DEBUG: useEffect triggered.");
        console.log("ADMIN_WAF_DEBUG: Current auth loading:", loading);
        console.log("ADMIN_WAF_DEBUG: Current user object:", user);
        console.log("ADMIN_WAF_DEBUG: Current userClaims object:", userClaims);
        console.log("ADMIN_WAF_DEBUG: isAdmin (calculated from userClaims):", isAdmin);

        if (!loading && isAdmin) { // Trigger fetch when auth is not loading and user is admin
            fetchBlockedIPs();
        } else if (!loading && !isAdmin) {
            console.log("ADMIN_WAF_DEBUG: Not an admin based on userClaims. Skipping WAF data fetch.");
        }
    }, [loading, isAdmin, fetchBlockedIPs, user, userClaims]); // Add user and userClaims to dependencies


    const handleBlockIP = async (e) => {
        e.preventDefault();
        setActionMessage('');
        setActionLoading(true);
        if (!blockIpAddress) {
            setActionMessage('Error: IP address is required to block.');
            setActionLoading(false);
            return;
        }
        try {
            const response = await authService.makeAuthenticatedRequest('/waf/block-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ipAddress: blockIpAddress }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to block IP.');
            }
            setActionMessage(`Success: ${data.message}`);
            setBlockIpAddress('');
            fetchBlockedIPs();
        } catch (error) {
            console.error('ADMIN_WAF_ERROR: Error blocking IP:', error);
            setActionMessage(`Error blocking IP: ${error.message || 'An unknown error occurred.'}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnblockIP = async (ipToUnblock) => {
        if (!window.confirm(`Are you sure you want to unblock ${ipToUnblock}?`)) {
            return;
        }
        setActionLoading(true);
        setActionMessage('');
        try {
            const response = await authService.makeAuthenticatedRequest('/waf/unblock-ip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ipAddress: ipToUnblock }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to unblock IP.');
            }
            setActionMessage(`Success: ${data.message}`);
            fetchBlockedIPs();
        } catch (error) {
            console.error('ADMIN_WAF_ERROR: Error unblocking IP:', error);
            setActionMessage(`Error unblocking IP: ${error.message || 'An unknown error occurred.'}`);
        } finally {
            setActionLoading(false);
        }
    };

    // Access control for the component itself
    console.log("ADMIN_WAF_DEBUG: Component rendering. isLoggedIn:", isLoggedIn, "isAdmin:", isAdmin);

    if (loading) {
        return <div className="admin-access-denied">Loading WAF management panel...</div>;
    }
    if (!isLoggedIn || !isAdmin) {
        console.log("ADMIN_WAF_DEBUG: Access denied condition met. Not logged in or not admin.");
        return (
            <div className="admin-access-denied">
                <h2>Access Denied</h2>
                <p>You do not have administrative privileges to view this WAF Management page.</p>
                <p>Please log in with an administrator account.</p>
            </div>
        );
    }

    return (
        <div className="admin-waf-management-container">
            <h2>Admin: WAF Management</h2>
            <p>Manage blocked IP addresses and monitor WAF events.</p>

            <form onSubmit={handleBlockIP} className="waf-action-form">
                <h3>Manually Block IP Address</h3>
                <div className="form-group">
                    <label htmlFor="blockIpAddress">IP Address:</label>
                    <input
                        type="text"
                        id="blockIpAddress"
                        value={blockIpAddress}
                        onChange={(e) => setBlockIpAddress(e.target.value)}
                        placeholder="e.g., 192.168.1.1"
                        pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$"
                        title="Enter a valid IPv4 address (e.g., 192.168.1.1)"
                        required
                    />
                </div>
                <button type="submit" disabled={actionLoading}>
                    {actionLoading ? 'Blocking...' : 'Block IP'}
                </button>
            </form>
            {actionMessage && <p className={`message ${actionMessage.includes('Success') ? 'success' : 'error'}`}>{actionMessage}</p>}

            <hr className="admin-divider" />

            <h3>Currently Blocked IPs</h3>
            {fetchIPsLoading ? (
                <p>Loading blocked IPs...</p>
            ) : fetchIPsError ? (
                <p className="message error">{fetchIPsError}</p>
            ) : blockedIPs.length === 0 ? (
                <p>No IP addresses currently blocked.</p>
            ) : (
                <table className="waf-ips-table">
                    <thead>
                        <tr>
                            <th>IP Address</th>
                            <th>Blocked On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blockedIPs.map((ipObj, index) => (
                            <tr key={ipObj.ipAddress || index}>
                                <td>{ipObj.ipAddress}</td>
                                <td>{ipObj.blockedAt ? new Date(ipObj.blockedAt).toLocaleString() : 'N/A'}</td>
                                <td>
                                    {/* FIX: Ensure closing button tag is present */}
                                    <button
                                        className="action-button unblock-button"
                                        onClick={() => handleUnblockIP(ipObj.ipAddress)}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Unblocking...' : 'Unblock'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

        </div>
    );
};

export default AdminWAFManagement;