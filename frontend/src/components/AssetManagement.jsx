import React, { useState, useEffect, useRef } from "react";
import { authService } from '../firebase/firebase';
import './AssetManagement.css';
import { useNavigate } from "react-router-dom";
import useIdleLogout from './useIdleLogout';
import { FaDownload, FaEye, FaTrash } from 'react-icons/fa';

function AssetManagement() {
  useIdleLogout();
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ name: "", type: "", value: 0, description: "" });
  const [editId, setEditId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  // Allowed file types for display
  const allowedFileTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/bmp': ['.bmp'],
    'image/tiff': ['.tiff', '.tif'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'application/xml': ['.xml'],
    'application/rtf': ['.rtf'],
    'video/mp4': ['.mp4'],
    'video/avi': ['.avi'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav']
  };

  useEffect(() => {
    if (!authService.currentUser) {
      alert("You must be logged in to access this page.");
      navigate("/login");
    } else {
      fetchAssets();
    }
  }, [navigate]);

  const fetchAssets = async () => {
    try {
      const res = await authService.makeAuthenticatedRequest("/api/assets");
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error("Error fetching assets:", err);
      alert("Error fetching assets");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "value" ? Number(value) : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        e.target.value = '';
        return;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const isAllowed = Object.values(allowedFileTypes).some(extensions =>
        extensions.includes(fileExtension)
      );

      if (!isAllowed) {
        alert("File type not allowed. Please choose a supported file type.");
        e.target.value = '';
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    const currentUser = authService.currentUser;
    if (!currentUser) {
      alert("User not authenticated");
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('type', form.type);
      formData.append('value', parseFloat(form.value));
      formData.append('description', form.description || '');
      formData.append('owner', currentUser.uid);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const url = editId ? `/api/assets/${editId}` : "/api/assets";
      const method = editId ? "PUT" : "POST";

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const res = await authService.makeAuthenticatedRequest(url, {
        method,
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      setForm({ name: "", type: "", value: 0, description: "" });
      setSelectedFile(null);
      setFilePreview(null);
      setEditId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await fetchAssets();
      alert(editId ? "Asset updated successfully!" : "Asset added successfully!");

    } catch (err) {
      console.error("Error saving asset:", err);

      if (err.message.includes('Malicious file detected')) {
        alert("⚠️ SECURITY ALERT: Malicious file detected! The file has been quarantined and your access may be temporarily restricted for security reasons.");
      } else if (err.message.includes('File too large')) {
        alert("File size exceeds the maximum allowed limit of 10MB.");
      } else if (err.message.includes('MIME type not allowed')) {
        alert("File type not supported. Please choose a different file.");
      } else {
        alert("Error saving asset: " + err.message);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (asset) => {
    setForm({
      name: asset.name || "",
      type: asset.type || "",
      value: asset.value ?? 0,
      description: asset.description || "",
    });
    setEditId(asset._id);
    // Note: We don't set the file for editing - user must upload a new file to replace
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this asset? This will also remove any associated files.")) {
      try {
        const res = await authService.makeAuthenticatedRequest(`/api/assets/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error('Delete failed');
        }

        await fetchAssets();
        alert("Asset deleted successfully!");
      } catch (err) {
        console.error("Error deleting asset:", err);
        alert("Error deleting asset");
      }
    }
  };

  const handleFileDownload = async (assetId, fileName) => {
    try {
      const res = await authService.makeAuthenticatedRequest(`/api/assets/${assetId}/download`);

      if (!res.ok) {
        throw new Error('Download failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Error downloading file");
    }
  };

  const handleFileView = async (assetId) => {
    try {
      const url = `${process.env.REACT_APP_API_BASE_URL}/api/assets/${assetId}/view`;
      window.open(url, '_blank');
    } catch (err) {
      console.error("Error viewing file:", err);
      alert("Error viewing file");
    }
  };

  const handleRemoveFile = async (assetId) => {
    if (window.confirm("Remove the file from this asset?")) {
      try {
        const res = await authService.makeAuthenticatedRequest(`/api/assets/${assetId}/file`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error('Remove file failed');
        }

        await fetchAssets();
        alert("File removed successfully!");
      } catch (err) {
        console.error("Error removing file:", err);
        alert("Error removing file");
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📊';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '🗜️';
    if (mimeType === 'text/csv') return '📈';
    if (mimeType === 'application/json') return '🗂️';
    if (mimeType?.includes('xml')) return '🗂️';
    if (mimeType === 'application/rtf') return '📝';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    return '📎';
  };

  return (
    <div className="asset-container">
      <h1>Asset Management</h1>

      <form onSubmit={handleSubmit} className="asset-form">
        <div className="form-row">
          <input
            type="text"
            name="name"
            placeholder="Asset Name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={isUploading}
          />
          <input
            type="text"
            name="type"
            placeholder="Asset Type"
            value={form.type}
            onChange={handleChange}
            required
            disabled={isUploading}
          />
        </div>

        <div className="form-row">
          <input
            type="number"
            name="value"
            placeholder="Asset Value"
            value={form.value}
            onChange={handleChange}
            required
            disabled={isUploading}
          />
          <input
            type="text"
            name="description"
            placeholder="Description (optional)"
            value={form.description}
            onChange={handleChange}
            disabled={isUploading}
          />
        </div>

        <div className="file-upload-section">
          <label htmlFor="file-input" className="file-input-label">
            📎 Attach File (optional)
          </label>
          <input
            id="file-input"
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            className="file-input"
            accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.csv,.json,.xml,.rtf,.mp4,.avi,.mp3,.wav" />

          {selectedFile && (
            <div className="file-preview">
              <div className="file-info">
                <span className="file-icon">{getFileIcon(selectedFile.type)}</span>
                <div className="file-details">
                  <div className="file-name">{selectedFile.name}</div>
                  <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="remove-file-btn"
                  disabled={isUploading}
                >
                  ✕
                </button>
              </div>

              {filePreview && (
                <div className="image-preview">
                  <img src={filePreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                </div>
              )}
            </div>
          )}

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="progress-text">Uploading... {uploadProgress}%</div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isUploading}>
            {isUploading ? "Processing..." : (editId ? "Update" : "Add")}
          </button>
          {editId && (
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setEditId(null);
                setForm({ name: "", type: "", value: 0, description: "" });
                setSelectedFile(null);
                setFilePreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={isUploading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="asset-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Value</th>
            <th>Description</th>
            <th>File</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset._id}>
              <td>{asset.name}</td>
              <td>{asset.type}</td>
              <td>${asset.value?.toLocaleString()}</td>
              <td>{asset.description || '-'}</td>
              <td>
                {asset.hasFile ? (
                  <div className="file-cell">
                    <div className="file-info-compact">
                      <span className="file-icon">{getFileIcon(asset.file.mimeType)}</span>
                      <div className="file-details-compact">
                        <div className="file-name-compact" title={asset.file.originalName}>
                          {asset.file.originalName.length > 20
                            ? asset.file.originalName.substring(0, 20) + '...'
                            : asset.file.originalName}
                        </div>
                        <div className="file-size-compact">
                          {formatFileSize(asset.file.fileSize)}
                        </div>
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        className="file-action-btn download"
                        onClick={() => handleFileDownload(asset._id, asset.file.originalName)}
                        title="Download file"
                      >
                        <FaDownload />
                      </button>
                      {asset.file.isViewable && (
                        <button
                          className="file-action-btn view"
                          onClick={() => handleFileView(asset._id)}
                          title="View file"
                        >
                          <FaEye />
                        </button>
                      )}
                      <button
                        className="file-action-btn remove"
                        onClick={() => handleRemoveFile(asset._id)}
                        title="Remove file"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="no-file">No file</span>
                )}
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    className="icon-btn edit"
                    onClick={() => handleEdit(asset)}
                    title="Edit asset"
                  >
                    Edit
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => handleDelete(asset._id)}
                    title="Delete asset"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan="6" align="center">
                No assets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="security-info">
        <h3>🔐 File Security Information</h3>
        <ul>
          <li>All uploaded files are automatically scanned for malicious content</li>
          <li>Safe files are encrypted and stored securely</li>
          <li>Malicious files are quarantined and uploaders may be temporarily blocked</li>
          <li>Maximum file size: 10MB</li>
          <li>Supported file types: Images, PDF, Office documents, Text files, Archives</li>
        </ul>
      </div>
    </div>
  );
}

export default AssetManagement;
