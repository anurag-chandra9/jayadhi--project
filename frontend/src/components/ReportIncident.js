import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { authService } from '../firebase/firebase';
import {
  FileText, MailCheck, Download, Loader, CheckCircle, XCircle,
  Landmark, User, Phone, CalendarDays, Clock, AlertTriangle,
  Check, Shield, Activity, Signature
} from 'lucide-react';
import './ReportIncident.css';

const ReportIncident = () => {
  const fieldLabels = {
    companyName: 'Company Name *',
    businessAddress: 'Business Address',
    contactPersonName: 'Contact Person Name',
    contactEmail: 'Contact Email *',
    contactPhone: 'Contact Phone',
    insuranceProvider: 'Insurance Provider',
    policyNumber: 'Policy Number',
    coverageType: 'Coverage Type',
    incidentTitle: 'Incident Title *',
    incidentDate: 'Date of Incident',
    incidentTime: 'Time of Incident',
    severityLevel: 'Severity Level',
    incidentType: 'Incident Type',
    status: 'Status',
    affectedAssets: 'Affected Assets (comma-separated)',
    discoveryMethod: 'How was the incident discovered?',
    estimatedImpact: 'Estimated Impact',
    financialLoss: 'Estimated Financial Loss (Rs.)',
    downtimeHours: 'Downtime Experienced (hours)',
    dataCompromised: 'Data Compromised',
    evidenceLink: 'Evidence (Drive Link)',
    actionsTaken: 'Actions Taken',
    lawEnforcementNotified: 'Was law enforcement notified?',
    agencyName: 'Agency Name',
    referenceNumber: 'Reference Number',
    authorizedSignatoryName: 'Authorized Signatory Name',
    designation: 'Designation',
    signature: 'Signature (digital/typed)',
    sendEmail: 'Send report via email'
  };

  const fieldIcons = {
    companyName: <Landmark size={14} />, contactPersonName: <User size={14} />,
    contactEmail: <MailCheck size={14} />, contactPhone: <Phone size={14} />,
    incidentDate: <CalendarDays size={14} />, incidentTime: <Clock size={14} />,
    severityLevel: <AlertTriangle size={14} />, incidentTitle: <FileText size={14} />,
    status: <Check size={14} />, incidentType: <Shield size={14} />,
    signature: <Signature size={14} />
  };

  const [formData, setFormData] = useState({
    companyName: '', businessAddress: '', contactPersonName: '', contactEmail: '',
    contactPhone: '', insuranceProvider: '', policyNumber: '', coverageType: '',
    incidentTitle: '', incidentDate: '', incidentTime: '', severityLevel: 'Medium',
    incidentType: 'Security Incident', status: 'Open', affectedAssets: '',
    discoveryMethod: '', estimatedImpact: '', financialLoss: '', downtimeHours: '',
    dataCompromised: '', evidenceLink: '', actionsTaken: '', lawEnforcementNotified: 'No',
    agencyName: '', referenceNumber: '', authorizedSignatoryName: '', designation: '',
    signature: '', sendEmail: true
  });

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!formData.companyName || !formData.incidentTitle || !formData.contactEmail) {
      setStatus({ success: false, message: 'Please fill in all required fields: Company Name, Incident Title, and Contact Email' });
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
      if (result.success) {
        setFormData({ ...formData, companyName: '', contactEmail: '', incidentTitle: '' });
      }
    } catch (error) {
      setStatus({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const sections = {
    'Company Information': ['companyName', 'businessAddress', 'contactPersonName', 'contactEmail', 'contactPhone'],
    'Insurance Policy Details': ['insuranceProvider', 'policyNumber', 'coverageType'],
    'Incident Details': ['incidentTitle', 'incidentDate', 'incidentTime', 'severityLevel', 'incidentType', 'status'],
    'Description of Incident': ['affectedAssets', 'discoveryMethod', 'estimatedImpact', 'financialLoss', 'downtimeHours', 'dataCompromised', 'evidenceLink', 'actionsTaken'],
    'Law Enforcement Notification': ['lawEnforcementNotified', 'agencyName', 'referenceNumber'],
    'Legal Declaration': ['authorizedSignatoryName', 'designation', 'signature']
  };

  const renderField = (field) => {
    const isTextarea = ['businessAddress', 'estimatedImpact', 'actionsTaken', 'discoveryMethod', 'dataCompromised'].includes(field);
    const isSelect = ['severityLevel', 'incidentType', 'status', 'lawEnforcementNotified'].includes(field);

    if (isSelect) {
      const options = field === 'severityLevel' ? ['Low', 'Medium', 'High', 'Critical'] :
        field === 'incidentType' ? ['Security Incident', 'Data Breach', 'Malware Attack', 'Phishing', 'DDoS Attack', 'Insider Threat', 'Other'] :
          field === 'status' ? ['Open', 'In Progress', 'Under Investigation', 'Resolved', 'Closed'] : ['No', 'Yes'];
      return <select name={field} value={formData[field]} onChange={handleChange}>{options.map(o => <option key={o}>{o}</option>)}</select>;
    }
    if (isTextarea) {
      return <textarea name={field} value={formData[field]} onChange={handleChange} rows="3" />;
    }

    const inputType = field === 'incidentDate' ? 'date' : field === 'incidentTime' ? 'time' :
      field === 'contactEmail' ? 'email' : field === 'contactPhone' ? 'tel' :
        field === 'financialLoss' || field === 'downtimeHours' ? 'number' : field === 'evidenceLink' ? 'url' : 'text';

    return (
      <input
        type={inputType}
        name={field}
        value={formData[field]}
        onChange={handleChange}
        required={['companyName', 'incidentTitle', 'contactEmail'].includes(field)}
        placeholder={field === 'financialLoss' ? 'Enter amount in Rupees' :
          field === 'downtimeHours' ? 'Enter hours' : field === 'evidenceLink' ? 'https://drive.google.com/...' : ''}
        min={field === 'financialLoss' || field === 'downtimeHours' ? '0' : undefined}
        step={field === 'financialLoss' ? '0.01' : field === 'downtimeHours' ? '0.1' : undefined}
      />
    );
  };

  return (
    <motion.div
      className="report-incident-page"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2><FileText size={22} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Report Cybersecurity Incident</h2>
      <p className="form-subtitle">Complete this form to generate an official insurance claim report</p>
      <div className="report-incident-form">
        <form onSubmit={handleSubmit}>
          {Object.entries(sections).map(([sectionTitle, fields], index) => (
            <motion.div
              key={sectionTitle}
              className="form-section"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">{sectionTitle}</h3>
              <div className="section-fields">
                {fields.map(field => (
                  <div key={field} className="form-group">
                    <label>{fieldIcons[field]} {fieldLabels[field]}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </motion.div>
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
            <motion.button
              type="submit"
              disabled={loading}
              className="submit-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <><Loader size={16} className="spin" style={{ marginRight: '8px' }} />Generating Report...</> : <><FileText size={16} style={{ marginRight: '8px' }} />Generate Insurance Report</>}
            </motion.button>
          </div>
        </form>
      </div>

      {status && (
        <motion.div
          className={`status-message ${status.success ? 'success' : 'error'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p>
            {status.success ? <CheckCircle color="green" size={18} style={{ marginRight: '5px' }} /> : <XCircle color="red" size={18} style={{ marginRight: '5px' }} />}
            {status.message}
          </p>
          {status.success && (
            <div className="success-details">
              <p><strong>Incident ID:</strong> {status.incidentId}</p>
              <p><strong>Report File:</strong> {status.reportFileName}</p>
              <p><strong>Generated:</strong> {new Date(status.timestamp).toLocaleString()}</p>
              {status.emailSent && <p><strong>Email Status:</strong> <MailCheck size={14} /> Sent</p>}
              <p className="download-link">
                <a href={`${process.env.NODE_ENV === 'production' ? (process.env.REACT_APP_API_URL || 'https://jayadhi-project-1-fafl.onrender.com') : (process.env.REACT_APP_API_URL || 'http://localhost:3000')}/reports/${status.reportFileName}`} target="_blank" rel="noreferrer" className="pdf-link">
                  <Download size={16} style={{ marginRight: '6px' }} />Download PDF Report
                </a>
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ReportIncident;
