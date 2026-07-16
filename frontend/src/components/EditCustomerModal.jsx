import { useState } from 'react';
import api from '../api/axios';

export default function EditCustomerModal({ customer, onClose, onUpdated }) {
  const [name, setName] = useState(customer.name || '');
  const [email, setEmail] = useState(customer.email || '');
  const [mobile, setMobile] = useState(customer.mobile || '');
  const [address, setAddress] = useState(customer.address || '');
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
      const res = await api.put(`/customers/${customer._id}`, { name, email, mobile, address });
      onUpdated(res.data.customer);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Edit Customer</span>
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