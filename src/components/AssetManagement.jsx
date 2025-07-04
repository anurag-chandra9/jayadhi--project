import React, { useState, useEffect } from "react";
import { authService } from '../firebase/firebase';
import './AssetManagement.css'; // ✅ Add this import

function AssetManagement() {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ name: "", type: "", value: 0 });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await authService.makeAuthenticatedRequest("/api/assets");
      const data = await res.json();
      setAssets(data);
    } catch (err) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = authService.currentUser;
    if (!currentUser) return alert("User not authenticated");

    const cleanedForm = {
      ...form,
      value: parseFloat(form.value),
      owner: currentUser.uid,
    };

    try {
      if (editId) {
        await authService.makeAuthenticatedRequest(`/api/assets/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedForm),
        });
        setEditId(null);
      } else {
        await authService.makeAuthenticatedRequest("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedForm),
        });
      }
      setForm({ name: "", type: "", value: 0 });
      fetchAssets();
    } catch (err) {
      alert("Error saving asset");
      console.error("POST/PUT error:", err);
    }
  };

  const handleEdit = (asset) => {
    setForm({
      name: asset.name || "",
      type: asset.type || "",
      value: asset.value ?? 0,
    });
    setEditId(asset._id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this asset?")) {
      try {
        await authService.makeAuthenticatedRequest(`/api/assets/${id}`, {
          method: "DELETE",
        });
        fetchAssets();
      } catch (err) {
        alert("Error deleting asset");
      }
    }
  };

  return (
    <div className="asset-container">
      <h2>Asset Management</h2>

      <form onSubmit={handleSubmit} className="asset-form">
        <input
          type="text"
          name="name"
          placeholder="Asset Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="type"
          placeholder="Asset Type"
          value={form.type}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="value"
          placeholder="Asset Value"
          value={form.value}
          onChange={handleChange}
          required
        />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editId ? "Update" : "Add"}
          </button>
          {editId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEditId(null);
                setForm({ name: "", type: "", value: 0 });
              }}
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset._id}>
              <td>{asset.name}</td>
              <td>{asset.type}</td>
              <td>${asset.value.toFixed(2)}</td>
              <td>
                <button className="btn-action edit" onClick={() => handleEdit(asset)}>Edit</button>
                <button className="btn-action delete" onClick={() => handleDelete(asset._id)}>Delete</button>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan="4" className="no-data">No assets found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AssetManagement;
