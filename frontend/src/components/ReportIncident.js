import React, { useState } from 'react';
import { authService } from '../firebase/firebase'; // or your auth wrapper
import './ReportIncident.css';

const ReportIncident = () => {
    const fieldLabels = {
        // Company Information
        companyName: 'Company Name *',
        businessAddress: 'Business Address',
        contactPersonName: 'Contact Person Name',
        contactEmail: 'Contact Email *',
        contactPhone: 'Contact Phone',
        
        // Insurance Policy Details
        insuranceProvider: 'Insurance Provider',
        policyNumber: 'Policy Number',
        coverageType: 'Coverage Type',
        
        // Incident Details
        incidentTitle: 'Incident Title *',
        incidentDate: 'Date of Incident',
        incidentTime: 'Time of Incident',
        severityLevel: 'Severity Level',
        incidentType: 'Incident Type',
        status: 'Status',
        
        // Description of Incident
        affectedAssets: 'Affected Assets (comma-separated)',
        discoveryMethod: 'How was the incident discovered?',
        estimatedImpact: 'Estimated Impact',
        financialLoss: 'Estimated Financial Loss (Rs.)',
        downtimeHours: 'Downtime Experienced (hours)',
        dataCompromised: 'Data Compromised',
        evidenceLink: 'Evidence (Drive Link)',
        actionsTaken: 'Actions Taken',
        
        // Law Enforcement Notification
        lawEnforcementNotified: 'Was law enforcement notified?',
        agencyName: 'Agency Name',
        referenceNumber: 'Reference Number',
        
        // Legal Declaration
        authorizedSignatoryName: 'Authorized Signatory Name',
        designation: 'Designation',
        signature: 'Signature (digital/typed)',
        
        // Options
        sendEmail: 'Send report via email'
    };

    const [formData, setFormData] = useState({
        // Company Information
        companyName: '',
        businessAddress: '',
        contactPersonName: '',
        contactEmail: '',
        contactPhone: '',
        
        // Insurance Policy Details
        insuranceProvider: '',
        policyNumber: '',
        coverageType: '',
        
        // Incident Details
        incidentTitle: '',
        incidentDate: '',
        incidentTime: '',
        severityLevel: 'Medium',
        incidentType: 'Security Incident',
        status: 'Open',
        
        // Description of Incident
        affectedAssets: '',
        discoveryMethod: '',
        estimatedImpact: '',
        financialLoss: '',
        downtimeHours: '',
        dataCompromised: '',
        evidenceLink: '',
        actionsTaken: '',
        
        // Law Enforcement Notification
        lawEnforcementNotified: 'No',
        agencyName: '',
        referenceNumber: '',
        
        // Legal Declaration
        authorizedSignatoryName: '',
        designation: '',
        signature: '',
        
        // Options
        sendEmail: true
    });

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        // Validate required fields
        if (!formData.companyName || !formData.incidentTitle || !formData.contactEmail) {
            setStatus({ 
                success: false, 
                message: 'Please fill in all required fields: Company Name, Incident Title, and Contact Email' 
            });
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            affectedAssets: formData.affectedAssets.split(',').map(item => item.trim()).filter(item => item),
            incidentDate: formData.incidentDate || new Date().toISOString().split('T')[0],
            incidentTime: formData.incidentTime || new Date().toTimeString().split(' ')[0]
        };

        try {
            const response = await authService.makeAuthenticatedRequest('/api/incidents/report', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            setStatus(result);
            
            // Reset form on success
            if (result.success) {
                setFormData({
                    companyName: '',
                    businessAddress: '',
                    contactPersonName: '',
                    contactEmail: '',
                    contactPhone: '',
                    insuranceProvider: '',
                    policyNumber: '',
                    coverageType: '',
                    incidentTitle: '',
                    incidentDate: '',
                    incidentTime: '',
                    severityLevel: 'Medium',
                    incidentType: 'Security Incident',
                    status: 'Open',
                    affectedAssets: '',
                    discoveryMethod: '',
                    estimatedImpact: '',
                    financialLoss: '',
                    downtimeHours: '',
                    dataCompromised: '',
                    evidenceLink: '',
                    actionsTaken: '',
                    lawEnforcementNotified: 'No',
                    agencyName: '',
                    referenceNumber: '',
                    authorizedSignatoryName: '',
                    designation: '',
                    signature: '',
                    sendEmail: true
                });
            }
        } catch (error) {
            setStatus({ success: false, message: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Group fields by sections for better UI organization
    const sections = {
        'Company Information': [
            'companyName', 'businessAddress', 'contactPersonName', 'contactEmail', 'contactPhone'
        ],
        'Insurance Policy Details': [
            'insuranceProvider', 'policyNumber', 'coverageType'
        ],
        'Incident Details': [
            'incidentTitle', 'incidentDate', 'incidentTime', 'severityLevel', 'incidentType', 'status'
        ],
        'Description of Incident': [
            'affectedAssets', 'discoveryMethod', 'estimatedImpact', 'financialLoss', 'downtimeHours', 'dataCompromised', 'evidenceLink', 'actionsTaken'
        ],
        'Law Enforcement Notification': [
            'lawEnforcementNotified', 'agencyName', 'referenceNumber'
        ],
        'Legal Declaration': [
            'authorizedSignatoryName', 'designation', 'signature'
        ]
    };

    const renderField = (field) => {
        const isTextarea = [
            'businessAddress', 'estimatedImpact', 'actionsTaken', 'discoveryMethod', 'dataCompromised'
        ].includes(field);
        
        const isSelect = ['severityLevel', 'incidentType', 'status', 'lawEnforcementNotified'].includes(field);
        
        if (isSelect) {
            let options = [];
            if (field === 'severityLevel') {
                options = ['Low', 'Medium', 'High', 'Critical'];
            } else if (field === 'incidentType') {
                options = ['Security Incident', 'Data Breach', 'Malware Attack', 'Phishing', 'DDoS Attack', 'Insider Threat', 'Other'];
            } else if (field === 'status') {
                options = ['Open', 'In Progress', 'Under Investigation', 'Resolved', 'Closed'];
            } else if (field === 'lawEnforcementNotified') {
                options = ['No', 'Yes'];
            }
            
            return (
                <select 
                    name={field} 
                    value={formData[field]} 
                    onChange={handleChange}
                    required={field === 'severityLevel' || field === 'incidentType' || field === 'status'}
                >
                    {options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            );
        }
        
        if (isTextarea) {
            return (
                <textarea 
                    name={field} 
                    value={formData[field]} 
                    onChange={handleChange}
                    rows="3"
                />
            );
        }
        
        const inputType = field === 'incidentDate' ? 'date' : 
                         field === 'incidentTime' ? 'time' : 
                         field === 'contactEmail' ? 'email' :
                         field === 'contactPhone' ? 'tel' :
                         field === 'financialLoss' || field === 'downtimeHours' ? 'number' :
                         field === 'evidenceLink' ? 'url' : 'text';
        
        return (
            <input
                type={inputType}
                name={field}
                value={formData[field]}
                onChange={handleChange}
                required={field === 'companyName' || field === 'incidentTitle' || field === 'contactEmail'}
                placeholder={field === 'financialLoss' ? 'Enter amount in Rupees' : 
                           field === 'downtimeHours' ? 'Enter hours' : 
                           field === 'evidenceLink' ? 'https://drive.google.com/...' : ''}
                min={field === 'financialLoss' || field === 'downtimeHours' ? '0' : undefined}
                step={field === 'financialLoss' ? '0.01' : field === 'downtimeHours' ? '0.1' : undefined}
            />
        );
    };

    return (
        <div className="report-incident-page">
            <h2>📝 Report Cybersecurity Incident</h2>
            <p className="form-subtitle">Complete this form to generate an official insurance claim report</p>
            <div className="report-incident-form">
            <form onSubmit={handleSubmit}>
                {Object.entries(sections).map(([sectionTitle, fields]) => (
                    <div key={sectionTitle} className="form-section">
                        <h3 className="section-title">{sectionTitle}</h3>
                        <div className="section-fields">
                            {fields.map(field => (
                                <div key={field} className="form-group">
                                    <label>{fieldLabels[field]}</label>
                                    {renderField(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                <div className="form-section">
                    <h3 className="section-title">Email Options</h3>
                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="sendEmail"
                                checked={formData.sendEmail}
                                onChange={handleChange}
                            />
                            {fieldLabels.sendEmail}
                        </label>
                    </div>
                </div>
                
                <div className="form-actions">
                    <button type="submit" disabled={loading} className="submit-button">
                        {loading ? 'Generating Report...' : '📄 Generate Insurance Report'}
                    </button>
                </div>
            </form>
            </div>

            {status && (
                <div className={`status-message ${status.success ? 'success' : 'error'}`}>
                    <p>{status.message}</p>
                    {status.success && (
                        <div className="success-details">
                            <p><strong>Incident ID:</strong> {status.incidentId}</p>
                            <p><strong>Report File:</strong> {status.reportFileName}</p>
                            <p><strong>Generated:</strong> {new Date(status.timestamp).toLocaleString()}</p>
                            {status.emailSent && <p><strong>Email Status:</strong> ✅ Sent successfully</p>}
                            <p className="download-link">
                                <a
                                    href={`http://localhost:3000/reports/${status.reportFileName}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="pdf-link"
                                >
                                    📄 Download PDF Report
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