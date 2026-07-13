import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AddTransactionModal from '../components/AddTransactionModal';
import { SHOP_NAME } from '../config';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Normalizes a saved mobile number into WhatsApp's expected format (country code, digits only).
// Assumes India (+91) when a plain 10-digit number is stored, since that's what the
// "Mobile No." field in Add Customer collects. Returns null if there's nothing usable.
function formatPhoneForWhatsApp(mobile) {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, ''); // strip spaces, dashes, +, etc.
  if (!digits) return null;

  if (digits.length === 10) return `91${digits}`; // plain Indian number, no country code
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`; // leading 0
  return digits; // already has a country code
}

// Builds the WhatsApp reminder message, calculating everything fresh from live data —
// principal, rate, interest type, elapsed interest, and totals — no manual entry needed.
function buildWhatsAppMessage(customer, transactions, totals) {
  const loanLines = transactions
    .filter((t) => t.type === 'gave' && t.rate > 0)
    .map((t) => {
      const interestLabel = t.interestType === 'compound' ? 'compound' : 'simple';
      const till = t.returnDate ? ` till ${formatDate(t.returnDate)}` : '';
      const interest = t.interest || 0;
      return (
        `• You took ₹${t.amount.toFixed(0)} from "${SHOP_NAME}" at ${t.rate}% ${t.rateType} ${interestLabel} interest, ` +
        `given on ${formatDate(t.date)}${till}. Interest so far: ₹${interest.toFixed(0)}.`
      );
    });

  const lines = [
    `Hello ${customer.name},`,
    '',
    `This is a reminder from ${SHOP_NAME}.`,
    ''
  ];

  if (loanLines.length > 0) {
    lines.push(...loanLines, '');
  }

  lines.push(
    `Total principal: ₹${totals.gavePrincipal.toFixed(0)}`,
    `Total interest accrued: ₹${totals.gaveInterest.toFixed(0)}`,
    `Total amount due: ₹${totals.gave.toFixed(0)}`,
    '',
    'Please clear the dues at your earliest convenience. Thank you.',
    '',
    `- ${SHOP_NAME}`
  );

  return lines.join('\n');
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({
    gave: 0,
    got: 0,
    gaveInterest: 0,
    gotInterest: 0,
    gavePrincipal: 0,
    gotPrincipal: 0,
    balance: 0
  });
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null); // 'gave' | 'got' | null
  const [menuOpen, setMenuOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.customer);
      setTransactions(res.data.transactions);
      setTotals(res.data.totals);
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

  const handleAdded = () => {
    setModalType(null);
    load();
  };

  const handleDeleteCustomer = async () => {
    if (!window.confirm(`Delete ${customer.name} and all their transactions?`)) return;
    try {
      await api.delete(`/customers/${id}`);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendWhatsApp = () => {
    const phone = formatPhoneForWhatsApp(customer.mobile);
    if (!phone) {
      window.alert(
        `${customer.name} doesn't have a mobile number saved. Add one first (tap the ⋮ menu → edit customer) to send a WhatsApp reminder.`
      );
      return;
    }

    const message = buildWhatsAppMessage(customer, transactions, totals);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (!customer) return <div className="empty-state">Customer not found</div>;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" onClick={() => navigate('/')}>
            &#8592;
          </button>
          <span className="topbar-title">{customer.name}</span>
        </div>
        <div className="topbar-right">
          <button className="icon-btn whatsapp-btn" onClick={handleSendWhatsApp} title="Send WhatsApp reminder">
            💬
          </button>
          <button className="link-btn-white" onClick={() => setMenuOpen((m) => !m)}>
            &#8942;
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={handleDeleteCustomer}>
            Delete Customer
          </div>
        </div>
      )}

      <div className="summary-card">
        <div className="customer-detail-header">
          <div>{customer.name}</div>
          {customer.mobile && <div className="customer-sub">{customer.mobile}</div>}
          {customer.email && <div className="customer-sub">{customer.email}</div>}
        </div>
        <div className="summary-row" style={{ marginTop: 10 }}>
          <div className="summary-col">
            <div className="amount-red">₹{totals.gave.toFixed(0)}</div>
            <div className="summary-label">You gave</div>
            {totals.gaveInterest > 0 && (
              <div className="interest-subline">
                ₹{totals.gavePrincipal.toFixed(0)} + ₹{totals.gaveInterest.toFixed(0)} interest
              </div>
            )}
          </div>
          <div className="summary-divider" />
          <div className="summary-col">
            <div className="amount-green">₹{totals.got.toFixed(0)}</div>
            <div className="summary-label">You got</div>
            {totals.gotInterest > 0 && (
              <div className="interest-subline">
                ₹{totals.gotPrincipal.toFixed(0)} + ₹{totals.gotInterest.toFixed(0)} interest
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="transaction-list">
        {transactions.length === 0 && (
          <div className="empty-state">No transactions yet. Use the buttons below to add one.</div>
        )}
        {transactions.map((t) => {
          const interest = t.interest || 0;
          return (
            <div
              key={t._id}
              className="transaction-row"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/transaction/${t._id}`)}
            >
              <div className="transaction-main">
                <div className={t.type === 'gave' ? 'amount-red' : 'amount-green'}>
                  ₹{t.amount.toFixed(0)}
                </div>
                <div className="transaction-date">{formatDate(t.date)}</div>
              </div>
              <div className="transaction-details">
                {t.rate > 0 && (
                  <span className="badge">
                    {t.rate}% {t.rateType} ({t.interestType === 'compound' ? 'Compound' : 'Simple'})
                    {interest > 0 && ` • Interest ≈ ₹${interest.toFixed(0)}`}
                  </span>
                )}
                {t.returnDate && (
                  <span className="badge-outline">Return: {formatDate(t.returnDate)}</span>
                )}
                {t.note && <div className="transaction-note">{t.note}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bottom-actions">
        <button className="btn-gave" onClick={() => setModalType('gave')}>
          YOU GAVE ₹
        </button>
        <button className="btn-got" onClick={() => setModalType('got')}>
          YOU GOT ₹
        </button>
      </div>

      {modalType && (
        <AddTransactionModal
          customerId={id}
          type={modalType}
          onClose={() => setModalType(null)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}