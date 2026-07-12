import { useState } from 'react';
import api from '../api/axios';

// type: 'gave' | 'got'
export default function AddTransactionModal({ customerId, type, onClose, onAdded }) {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [rateType, setRateType] = useState('monthly');
  const [interestType, setInterestType] = useState('simple');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [returnDate, setReturnDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/transactions', {
        customerId,
        type,
        amount,
        rate: rate || 0,
        rateType,
        interestType,
        date,
        returnDate: returnDate || undefined,
        note
      });
      onAdded(res.data.transaction);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save transaction');
    } finally {
      setSaving(false);
    }
  };

  const title = type === 'gave' ? 'You Gave' : 'You Got';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${type === 'gave' ? 'header-red' : 'header-green'}`}>
          <span>Add Transaction ({title})</span>
          <button className="link-btn" onClick={handleSave} disabled={saving}>
            SAVE
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}
          <input
            placeholder="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <div className="row-2">
            <input
              placeholder="Rate (%)"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            <select value={rateType} onChange={(e) => setRateType(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="row-2">
            <div className="field-group">
              <label>Interest Type</label>
              <select value={interestType} onChange={(e) => setInterestType(e.target.value)}>
                <option value="simple">Simple Interest</option>
                <option value="compound">Compound Interest</option>
              </select>
            </div>
          </div>
          <div className="row-2">
            <div className="field-group">
              <label>Date</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field-group">
              <label>Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
          </div>
          <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button
            className={type === 'gave' ? 'btn-save-red' : 'btn-save-green'}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}