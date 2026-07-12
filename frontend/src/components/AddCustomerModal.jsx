import { useState } from 'react';
import api from '../api/axios';

export default function AddCustomerModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/customers', { name, email, mobile, address });
      onAdded(res.data.customer);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Add Account</span>
          <button className="link-btn" onClick={handleSave} disabled={saving}>
            SAVE
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}
          <input
            placeholder="Customer Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            placeholder="Email (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Mobile No. (Optional)"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <input
            placeholder="Address (Optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button className="btn-save-green" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}