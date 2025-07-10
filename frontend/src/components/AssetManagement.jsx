import React, { useState, useEffect } from "react";
import { authService } from '../firebase/firebase'; // Ensure this path is correct

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
      // Adjust this depending on your API response structure:
      // If the API returns { assets: [...] } use data.assets
      // If it returns an array directly, use data
      const assetsArray = Array.isArray(data) ? data : data.assets || [];
      setAssets(assetsArray);
    } catch (err) {
      alert("Error fetching assets");
      console.error(err);
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
    if (!currentUser) {
      alert("User not authenticated");
      return;
    }

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
              setForm({ name: "", type: "", value: 0 });
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
          {Array.isArray(assets) && assets.length > 0 ? (
            assets.map((asset) => (
              <tr key={asset._id}>
                <td>{asset.name}</td>
                <td>{asset.type}</td>
                <td>{asset.value}</td>
                <td>
                  <button onClick={() => handleEdit(asset)}>Edit</button>
                  <button onClick={() => handleDelete(asset._id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
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
