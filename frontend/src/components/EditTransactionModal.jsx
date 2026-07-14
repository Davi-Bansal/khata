import { useState } from 'react';
import api from '../api/axios';

// Converts a stored date into the value format the corresponding <input> expects.
function toDateTimeLocal(d) {
  if (!d) return new Date().toISOString().slice(0, 16);
  return new Date(d).toISOString().slice(0, 16);
}
function toDateOnly(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export default function EditTransactionModal({ transaction, onClose, onUpdated }) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [rate, setRate] = useState(transaction.rate ? String(transaction.rate) : '');
  const [rateType, setRateType] = useState(transaction.rateType || 'monthly');
  const [interestType, setInterestType] = useState(transaction.interestType || 'simple');
  const [date, setDate] = useState(toDateTimeLocal(transaction.date));
  const [returnDate, setReturnDate] = useState(toDateOnly(transaction.returnDate));
  const [note, setNote] = useState(transaction.note || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // How much capital has already been deposited against this loan — the edited
  // amount can never go below this, or the remaining balance would go negative.
  const capitalAlreadyPaid = (transaction.payments || [])
    .filter((p) => p.type === 'capital')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (capitalAlreadyPaid > 0 && Number(amount) < capitalAlreadyPaid) {
      setError(
        `Amount can't be less than ₹${capitalAlreadyPaid.toFixed(0)} already paid as capital against this loan`
      );
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/transactions/${transaction._id}`, {
        amount,
        rate: rate || 0,
        rateType,
        interestType,
        date,
        returnDate: returnDate || undefined,
        note
      });
      onUpdated(res.data.transaction);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update transaction');
    } finally {
      setSaving(false);
    }
  };

  const title = transaction.type === 'gave' ? 'You Gave' : 'You Got';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${transaction.type === 'gave' ? 'header-red' : 'header-green'}`}>
          <span>Edit Transaction ({title})</span>
          <button className="link-btn" onClick={handleSave} disabled={saving}>
            SAVE
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}

          {capitalAlreadyPaid > 0 && (
            <div className="payment-info-box">
              <div>
                ₹{capitalAlreadyPaid.toFixed(0)} already paid as capital — amount can't be reduced
                below this.
              </div>
            </div>
          )}

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
            className={transaction.type === 'gave' ? 'btn-save-red' : 'btn-save-green'}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}