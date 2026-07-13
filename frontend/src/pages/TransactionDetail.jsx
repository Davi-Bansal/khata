import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AddPaymentModal from '../components/AddPaymentModal';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [remainingCapital, setRemainingCapital] = useState(0);
  const [interestDue, setInterestDue] = useState(0);
  const [totalInterestPaid, setTotalInterestPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [depositType, setDepositType] = useState(null); // 'capital' | 'interest' | null

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/transactions/${id}`);
      setTransaction(res.data.transaction);
      setRemainingCapital(res.data.remainingCapital);
      setInterestDue(res.data.interestDue);
      setTotalInterestPaid(res.data.totalInterestPaid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDepositAdded = (data) => {
    setDepositType(null);
    setTransaction(data.transaction);
    setRemainingCapital(data.remainingCapital);
    setInterestDue(data.interestDue);
    setTotalInterestPaid(data.totalInterestPaid);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Remove this deposit?')) return;
    try {
      const res = await api.delete(`/transactions/${id}/payments/${paymentId}`);
      setTransaction(res.data.transaction);
      setRemainingCapital(res.data.remainingCapital);
      setInterestDue(res.data.interestDue);
      setTotalInterestPaid(res.data.totalInterestPaid);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try {
      await api.delete(`/transactions/${id}`);
      navigate(-1);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!transaction) return <div className="empty-state">Transaction not found</div>;

  const capitalDeposits = (transaction.payments || []).filter((p) => p.type === 'capital');
  const interestDeposits = (transaction.payments || []).filter((p) => p.type === 'interest');
  const totalCapitalDeposited = capitalDeposits.reduce((s, p) => s + p.amount, 0);
  const verb = transaction.type === 'gave' ? 'took' : 'gave';

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" onClick={() => navigate(-1)}>
            &#8592;
          </button>
          <span className="topbar-title">Entry Details</span>
        </div>
      </div>

      <div className="summary-card" style={{ textAlign: 'center' }}>
        <div>
          {transaction.customer?.name} {verb}
        </div>
        <div className={transaction.type === 'gave' ? 'amount-red' : 'amount-green'} style={{ fontSize: 32 }}>
          ₹{transaction.amount.toFixed(0)}
        </div>
        <div className="transaction-date">On {formatDate(transaction.date)}</div>
        <div className="amount-red" style={{ marginTop: 6 }}>
          Remaining Balance: ₹{remainingCapital.toFixed(0)}
        </div>
      </div>

      {/* ---- Capital deposits ---- */}
      <div className="section-heading">Deposit Capital Amount</div>
      {capitalDeposits.map((p) => (
        <div key={p._id} className="deposit-row" onClick={() => handleDeletePayment(p._id)}>
          <div>₹{p.amount.toFixed(0)}</div>
          <div className="interest-subline">Amount deposited on {formatDate(p.date)}</div>
        </div>
      ))}
      {capitalDeposits.length === 0 && <div className="empty-state-small">No capital deposits yet</div>}

      <div className="detail-row">
        <span>Total Deposit Amount</span>
        <span>₹{totalCapitalDeposited.toFixed(0)}</span>
      </div>
      {transaction.returnDate && (
        <div className="detail-row">
          <span>Return Date</span>
          <span>{formatDate(transaction.returnDate)}</span>
        </div>
      )}
      <div className="detail-row">
        <span>Interest Due</span>
        <span>₹{interestDue.toFixed(0)}</span>
      </div>
      <div className="detail-row">
        <span>Rate</span>
        <span>
          {transaction.rate}% {transaction.rateType}
        </span>
      </div>
      {transaction.note && (
        <div className="detail-row">
          <span>Note</span>
          <span>{transaction.note}</span>
        </div>
      )}

      {/* ---- Interest deposits ---- */}
      <div className="detail-row">
        <span>Total Deposit Interest</span>
        <span>₹{totalInterestPaid.toFixed(0)}</span>
      </div>
      <div className="section-heading">Deposit Interest</div>
      <div className="deposit-row-list">
        {interestDeposits.map((p) => (
          <div key={p._id} className="deposit-row" onClick={() => handleDeletePayment(p._id)}>
            <div>₹{p.amount.toFixed(0)}</div>
            <div className="interest-subline">Interest deposited on {formatDate(p.date)}</div>
          </div>
        ))}
        {interestDeposits.length === 0 && <div className="empty-state-small">No interest deposits yet</div>}
      </div>

      <div className="bottom-actions">
        <button
          className="btn-save-green"
          onClick={() => setDepositType('capital')}
          disabled={remainingCapital <= 0}
        >
          Deposit Capital
        </button>
        <button className="btn-save-green" onClick={() => setDepositType('interest')}>
          Deposit Interest
        </button>
      </div>

      <button className="btn-delete-red" onClick={handleDeleteTransaction}>
        Delete Transaction
      </button>

      {depositType && (
        <AddPaymentModal
          transactionId={id}
          type={depositType}
          remainingCapital={remainingCapital}
          interestDue={interestDue}
          onClose={() => setDepositType(null)}
          onAdded={handleDepositAdded}
        />
      )}
    </div>
  );
}