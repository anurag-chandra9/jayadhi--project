import React, { useState } from 'react';
import { authService } from '../firebase/firebase'; // or your auth wrapper
import './ReportIncident.css';

const ReportIncident = () => {
    const fieldLabels = {
        title: 'Incident Title',
        description: 'Description',
        affectedAssets: 'Affected Assets (comma-separated)',
        timestamp: 'Incident Timestamp',
        severity: 'Severity Level',
        type: 'Incident Type',
        status: 'Status',
        reportedBy: 'Reported By (Name or Email)',
        impact: 'Impact Assessment',
        immediateActions: 'Immediate Actions Taken',
        recommendations: 'Recommendations'
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        affectedAssets: '',
        timestamp: '',
        severity: 'Medium',
        type: 'Security Incident',
        status: 'Open',
        reportedBy: '',
        impact: '',
        immediateActions: '',
        recommendations: ''
    });

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const payload = {
            ...formData,
            affectedAssets: formData.affectedAssets.split(',').map(item => item.trim()),
            timestamp: formData.timestamp || new Date().toISOString()
        };

        try {
            const response = await authService.makeAuthenticatedRequest('/api/incidents/report', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            setStatus(result);
        } catch (error) {
            setStatus({ success: false, message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="report-incident-page">
            <h2>📝 Report Cybersecurity Incident</h2>
            <form onSubmit={handleSubmit}>
                {[
                    'title', 'description', 'affectedAssets', 'timestamp',
                    'severity', 'type', 'status', 'reportedBy',
                    'impact', 'immediateActions', 'recommendations'
                ].map(field => (
                    <div key={field} className="form-group">
                        <label>{fieldLabels[field]}</label>
                        {field === 'description' || field === 'impact' || field === 'immediateActions' || field === 'recommendations' ? (
                            <textarea name={field} value={formData[field]} onChange={handleChange} />
                        ) : (
                            <input
                                type={field === 'timestamp' ? 'datetime-local' : 'text'}
                                name={field}
                                value={formData[field]}
                                onChange={handleChange}
                            />
                        )}
                    </div>
                ))}
                <button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Report'}
                </button>
            </form>

            {status && (
                <div className={`status-message ${status.success ? 'success' : 'error'}`}>
                    <p>{status.message}</p>
                    {status.success && (
                        <div>
                            <p><strong>Incident ID:</strong> {status.data.incidentId}</p>
                            <p><strong>Email Sent:</strong> ✅</p>
                            <p>
                                <a
                                    href={`http://localhost:3000/reports/${status.data.reportPath.split('\\').pop()}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View PDF Report
                                </a>

                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportIncident;
