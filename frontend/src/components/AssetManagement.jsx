import React, { useState, useEffect } from "react";
import { authService } from "../firebase/firebase";
import { Pencil, Trash2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import "./AssetManagement.css";

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
      const assetsArray = Array.isArray(data) ? data : data.assets || [];
      setAssets(assetsArray);
    } catch (err) {
      toast.error("Error fetching assets");
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
      toast.error("User not authenticated");
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
        toast.success("Asset updated successfully!");
        setEditId(null);
      } else {
        await authService.makeAuthenticatedRequest("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedForm),
        });
        toast.success("Asset added successfully!");
      }
      setForm({ name: "", type: "", value: 0 });
      fetchAssets();
    } catch (err) {
      toast.error("Error saving asset");
      console.error("POST/PUT error:", err);
    }
  };

  const confirmDelete = (id) => {
    toast((t) => (
      <span style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <b>Confirm delete this asset?</b>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={() => {
              deleteAsset(id);
              toast.dismiss(t.id);
            }}
            style={{
              background: "#ef4444",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Yes
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: "#e5e7eb",
              color: "#000",
              padding: "4px 10px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
            }}
          >
            No
          </button>
        </div>
      </span>
    ), {
      duration: 5000,
    });
  };

  const deleteAsset = async (id) => {
    try {
      await authService.makeAuthenticatedRequest(`/api/assets/${id}`, {
        method: "DELETE",
      });
      toast.success("Asset deleted successfully!");
      fetchAssets();
    } catch (err) {
      toast.error("Error deleting asset");
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

  return (
    <div className="asset-container">
      <Toaster />
      <h2>🗃️ Asset Management</h2>
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
        <button type="submit">{editId ? "Update" : "Add"}</button>
        {editId && (
          <button
            type="button"
            className="cancel-btn"
            onClick={() => {
              setEditId(null);
              setForm({ name: "", type: "", value: 0 });
            }}
          >
            Cancel
          </button>
        )}
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
          {Array.isArray(assets) && assets.length > 0 ? (
            assets.map((asset) => (
              <tr key={asset._id}>
                <td>{asset.name}</td>
                <td>{asset.type}</td>
                <td>₹{asset.value.toLocaleString()}</td>
                <td>
                  <button
                    className="icon-btn edit"
                    onClick={() => handleEdit(asset)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => confirmDelete(asset._id)}
                  >
                    <Trash2 size={18} />
                  </button>
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
