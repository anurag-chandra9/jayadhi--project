import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CompliancePage.css';

// --- NEW: List of available security controls ---
const SECURITY_CONTROLS = [
    'access control', 'audit logging', 'incident response', 'encryption', 
    'network security', 'vulnerability management', 'data protection'
];

// --- UPDATED: Modal component with the new form layout ---
const CreateFrameworkModal = ({ onClose, onFrameworkCreated }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [requirements, setRequirements] = useState([{ section: '', title: '', description: '', securityControls: [] }]);
    const [error, setError] = useState('');

    const handleRequirementChange = (index, event) => {
        const values = [...requirements];
        values[index][event.target.name] = event.target.value;
        setRequirements(values);
    };

    const handleSecurityControlChange = (reqIndex, control) => {
        const values = [...requirements];
        const controls = values[reqIndex].securityControls;
        const currentIndex = controls.indexOf(control);
        if (currentIndex === -1) {
            controls.push(control);
        } else {
            controls.splice(currentIndex, 1);
        }
        values[reqIndex].securityControls = controls;
        setRequirements(values);
    };

    const addRequirementField = () => {
        setRequirements([...requirements, { section: '', title: '', description: '', securityControls: [] }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            const response = await fetch('/api/frameworks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                },
                body: JSON.stringify({ name, code, description, tags: tagsArray, requirements }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to create framework.');
            }
            
            onFrameworkCreated();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2><span role="img" aria-label="tools">🛠️</span> Create Custom Framework</h2>
                <form onSubmit={handleSubmit}>
                    <label>Framework Name:</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                    
                    <label>Framework Code:</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} required />
                    
                    <label>Description:</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} required />
                    
                    <label>Tags (comma-separated):</label>
                    <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="cybersecurity, compliance, audit" />
                    
                    <h4>Requirements</h4>
                    <div className="requirements-section">
                        {requirements.map((req, index) => (
                            <div key={index} className="requirement-input-group">
                                <p>Requirement #{index + 1}</p>
                                <input name="section" placeholder="Section (e.g., Section 1, Article A)" value={req.section} onChange={e => handleRequirementChange(index, e)} />
                                <input name="title" placeholder="Title" value={req.title} onChange={e => handleRequirementChange(index, e)} />
                                <textarea name="description" placeholder="Description" value={req.description} onChange={e => handleRequirementChange(index, e)} />
                                
                                <label>Security Controls:</label>
                                <div className="security-controls-list">
                                    {SECURITY_CONTROLS.map(control => (
                                        <label key={control}>
                                            <input type="checkbox" checked={req.securityControls.includes(control)} onChange={() => handleSecurityControlChange(index, control)} />
                                            {control}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="add-btn" onClick={addRequirementField}>+ Add New Requirement</button>
                    
                    {error && <p className="error-message">{error}</p>}
                    
                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="create-framework-btn">Create Framework</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const CompliancePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('frameworks');
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFrameworks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/frameworks', {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await response.json();
      setFrameworks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch frameworks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworks();
  }, [user]);

  const handleFrameworkCreated = () => {
    setIsModalOpen(false);
    fetchFrameworks(); // Refetch the list to include the new one
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case 'frameworks':
        return (
          <div className="frameworks-list">
            <div className="frameworks-header">
              <h3>Compliance Frameworks</h3>
              <button className="create-framework-btn" onClick={() => setIsModalOpen(true)}>+ Create Custom Framework</button>
            </div>
            {frameworks.map(fw => (
              <div key={fw._id} className="framework-card">
                <div className="card-header">
                  <h4>🏛️ {fw.name}</h4>
                  {fw.isDefault && <span className="default-tag">Default</span>}
                </div>
                <p className="card-code">Code: {fw.code}</p>
                <p className="card-description">{fw.description}</p>
                <div className="card-footer">
                  <span>Requirements: {fw.requirements.length}</span>
                  <button className="details-btn">👁️</button>
                </div>
              </div>
            ))}
          </div>
        );
      case 'assessments':
        return <div>Assessments content goes here.</div>;
      case 'results':
        return <div>Results content goes here.</div>;
      default:
        return null;
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="compliance-module">
      {isModalOpen && <CreateFrameworkModal onClose={() => setIsModalOpen(false)} onFrameworkCreated={handleFrameworkCreated} />}
      
      <h2>Compliance Tracking Module</h2>
      <div className="tabs">
        <button onClick={() => setActiveTab('frameworks')} className={activeTab === 'frameworks' ? 'active' : ''}>Frameworks</button>
        <button onClick={() => setActiveTab('assessments')} className={activeTab === 'assessments' ? 'active' : ''}>Assessments</button>
        <button onClick={() => setActiveTab('results')} className={activeTab === 'results' ? 'active' : ''}>Results</button>
      </div>
      <div className="tab-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default CompliancePage;
