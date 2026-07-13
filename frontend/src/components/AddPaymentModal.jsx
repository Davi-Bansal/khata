import { useState } from 'react';
import api from '../api/axios';

// type: 'capital' | 'interest'
export default function AddPaymentModal({ transactionId, type, remainingCapital, interestDue, onClose, onAdded }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const title = type === 'capital' ? 'Deposit Capital Amount' : 'Deposit Interest';

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (type === 'capital' && Number(amount) > remainingCapital) {
      setError(`Amount exceeds remaining balance of ₹${remainingCapital.toFixed(0)}`);
      return;
    }
    if (type === 'interest' && Number(amount) > interestDue) {
      setError(`Interest due (₹${interestDue.toFixed(0)}) is less than entered amount`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/transactions/${transactionId}/payments`, {
        type,
        amount,
        date,
        note
      });
      onAdded(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save deposit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header header-green">
          <span>{title}</span>
          <button className="link-btn" onClick={handleSave} disabled={saving}>
            SAVE
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}
          {type === 'capital' && (
            <div className="interest-subline" style={{ marginBottom: 8 }}>
              Remaining balance: ₹{remainingCapital.toFixed(0)}
            </div>
          )}
          {type === 'interest' && (
            <div className="interest-subline" style={{ marginBottom: 8 }}>
              Interest due: ₹{interestDue.toFixed(0)}
            </div>
          )}
          <input
            placeholder="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <div className="field-group">
            <label>Date</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-save-green" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}