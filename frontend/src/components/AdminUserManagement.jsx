// frontend/src/components/AdminUserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; // To get the current user's token
import { authService } from '../firebase/firebase'; // For making authenticated requests
import './AdminUserManagement.css'; // You'll create this CSS file next for styling

const AdminUserManagement = () => {
    const { user, isLoggedIn, loading, userClaims } = useAuth(); // Access auth context to confirm admin and get token
    const [targetEmail, setTargetEmail] = useState('');
    const [newRole, setNewRole] = useState('user'); // Default new role
    const [message, setMessage] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [users, setUsers] = useState([]); // To store the list of users
    const [fetchUsersLoading, setFetchUsersLoading] = useState(true);
    const [fetchUsersError, setFetchUsersError] = useState('');
    const [deletingUserId, setDeletingUserId] = useState(null); // Track which user is being deleted

    // Ensure the current logged-in user is an admin for UI visibility
    const isAdmin = user && userClaims && userClaims.role === 'admin'; // Correctly use userClaims

    // Function to fetch all users from the backend
    const fetchUsers = useCallback(async () => {
        if (!isAdmin) { // Only fetch if user is determined to be admin
            setFetchUsersLoading(false);
            return;
        }
        setFetchUsersLoading(true);
        setFetchUsersError('');
        try {
            const response = await authService.makeAuthenticatedRequest('/admin/users'); // Backend endpoint to get all users
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch users.');
            }
            setUsers(data.users);
        } catch (error) {
            console.error('Error fetching users for Admin User Management:', error);
            setFetchUsersError(`Failed to load users: ${error.message || 'Unknown error'}`);
        } finally {
            setFetchUsersLoading(false);
        }
    }, [isAdmin]); // Dependency: re-fetch if admin status changes

    useEffect(() => {
        // Fetch users only once admin status is determined and component is mounted
        if (!loading && isAdmin) {
            fetchUsers();
        }
    }, [loading, isAdmin, fetchUsers]);

    const handleSetUserRole = async (e) => {
        e.preventDefault();
        setMessage('');
        setSubmitLoading(true);

        if (!targetEmail || !newRole) {
            setMessage('Error: Email and new role are required.');
            setSubmitLoading(false);
            return;
        }

        try {
            const response = await authService.makeAuthenticatedRequest('/admin/set-user-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail, role: newRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update user role.');
            }

            setMessage(`Success: ${data.message}`);
            setTargetEmail(''); // Clear the input field
            setNewRole('user'); // Reset role dropdown
            fetchUsers(); // Refresh the user list after successful update
        } catch (error) {
            console.error('Error setting user role:', error);
            setMessage(`Error: ${error.message || 'An unknown error occurred.'}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteUser = async (userToDelete) => {
        if (!window.confirm(`Are you sure you want to delete user ${userToDelete.email}? This action cannot be undone.`)) {
            return; // User cancelled
        }
        setDeletingUserId(userToDelete.firebaseUid); // Set loading state for this specific user
        setMessage(''); // Clear general messages

        try {
            const response = await authService.makeAuthenticatedRequest(`/admin/users/${userToDelete.firebaseUid}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete user.');
            }

            setMessage(`Success: ${data.message}`);
            fetchUsers(); // Refresh the user list after successful deletion
        } catch (error) {
            console.error('Error deleting user:', error);
            setMessage(`Error: ${error.message || 'An unknown error occurred while deleting user.'}`);
        } finally {
            setDeletingUserId(null); // Clear loading state
        }
    };

    // Access control for the component itself
    if (loading) {
        return <div className="admin-access-denied">Loading user management panel...</div>;
    }
    if (!isLoggedIn || !isAdmin) {
        return (
            <div className="admin-access-denied">
                <h2>Access Denied</h2>
                <p>You do not have administrative privileges to view this page.</p>
                <p>Please log in with an administrator account.</p>
            </div>
        );
    }

    return (
        <div className="admin-user-management-container">
            <h2>Admin: User Role Management</h2>
            <p>Promote or demote users by changing their role.</p>
            <form onSubmit={handleSetUserRole}>
                <div className="form-group">
                    <label htmlFor="targetEmail">User Email:</label>
                    <input
                        type="email"
                        id="targetEmail"
                        value={targetEmail}
                        onChange={(e) => setTargetEmail(e.target.value)}
                        placeholder="Enter user's email"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="newRole">New Role:</label>
                    <select
                        id="newRole"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        {/* Add other roles if you have them */}
                    </select>
                </div>
                <button type="submit" disabled={submitLoading}>
                    {submitLoading ? 'Updating...' : 'Set User Role'}
                </button>
            </form>
            {message && <p className={`message ${message.includes('Success') ? 'success' : 'error'}`}>{message}</p>}

            <hr className="admin-divider" />

            <h3>All Users</h3>
            {fetchUsersLoading ? (
                <p>Loading users...</p>
            ) : fetchUsersError ? (
                <p className="message error">{fetchUsersError}</p>
            ) : users.length === 0 ? (
                <p>No users found.</p>
            ) : (
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Last Login</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.firebaseUid}>
                                <td>{u.email}</td>
                                <td>{u.username}</td>
                                <td>{u.role}</td>
                                <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'N/A'}</td>
                                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    {/* Prevent admin from deleting themselves */}
                                    {user && u.firebaseUid !== user.uid ? ( // Ensure user is not null
                                        <button
                                            className="action-button delete-button"
                                            onClick={() => handleDeleteUser(u)}
                                            disabled={deletingUserId === u.firebaseUid}
                                        >
                                            {deletingUserId === u.firebaseUid ? 'Deleting...' : 'Delete'}
                                        </button>
                                    ) : (
                                        <span className="current-admin-text">Current Admin</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AdminUserManagement;