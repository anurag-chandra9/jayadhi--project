import React, { useState, useEffect } from "react";
import axios from "axios";

function AssetManagement() {
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ name: "", type: "", value: "" });
  const [editId, setEditId] = useState(null);

  // Fetch all assets on component mount
  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await axios.get("/api/assets");
      setAssets(res.data);
    } catch (err) {
      alert("Error fetching assets");
    }
  };

  // Handle form input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Add or Edit asset
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // Edit asset
        await axios.put(`/api/assets/${editId}`, form);
        setEditId(null);
      } else {
        // Add asset
        await axios.post("/api/assets", form);
      }
      setForm({ name: "", type: "", value: "" });
      fetchAssets();
    } catch (err) {
      alert("Error saving asset");
    }
  };

  // Edit button click
  const handleEdit = (asset) => {
    setForm({ name: asset.name, type: asset.type, value: asset.value });
    setEditId(asset._id);
  };

  // Delete asset
  const handleDelete = async (id) => {
    if (window.confirm("Delete this asset?")) {
      try {
        await axios.delete(`/api/assets/${id}`);
        fetchAssets();
      } catch (err) {
        alert("Error deleting asset");
      }
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto" }}>
      <h2>Asset Management</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
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
        <button type="submit">{editId ? "Update" : "Add"}</button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm({ name: "", type: "", value: "" });
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <table border="1" width="100%">
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
              <td>{asset.value}</td>
              <td>
                <button onClick={() => handleEdit(asset)}>Edit</button>
                <button onClick={() => handleDelete(asset._id)}>Delete</button>
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan="4" align="center">
                No assets found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AssetManagement;