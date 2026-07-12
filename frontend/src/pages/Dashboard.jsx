import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AddCustomerModal from '../components/AddCustomerModal';
import ReportModal from '../components/ReportModal';
import SideDrawer from '../components/SideDrawer';

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [overall, setOverall] = useState({
    gave: 0,
    got: 0,
    gaveInterest: 0,
    gotInterest: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.customers);
      setOverall(res.data.overall);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleAdded = (customer) => {
    setShowAddModal(false);
    setCustomers((prev) => [
      {
        ...customer,
        gave: 0,
        got: 0,
        gaveInterest: 0,
        gotInterest: 0,
        gavePrincipal: 0,
        gotPrincipal: 0,
        balance: 0
      },
      ...prev
    ]);
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" onClick={() => setMenuOpen((m) => !m)}>
            &#9776;
          </button>
          <span className="topbar-title">Interest Book</span>
        </div>
        <div className="topbar-right">
          <div className="profile-menu-wrap">
            <button
              className="profile-avatar-btn"
              onClick={() => setProfileMenuOpen((m) => !m)}
              title={user?.name}
            >
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </button>
            {profileMenuOpen && (
              <>
                <div className="profile-menu-backdrop" onClick={() => setProfileMenuOpen(false)} />
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-avatar-large">
                      {user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="profile-name">{user?.name}</div>
                      <div className="profile-email">{user?.email}</div>
                    </div>
                  </div>
                  <button className="profile-logout-btn" onClick={logout}>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-row">
          <div className="summary-col">
            <div className="amount-red">₹{overall.gave.toFixed(0)}</div>
            <div className="summary-label">You gave</div>
            {overall.gaveInterest > 0 && (
              <div className="interest-subline">incl. ₹{overall.gaveInterest.toFixed(0)} interest</div>
            )}
          </div>
          <div className="summary-divider" />
          <div className="summary-col">
            <div className="amount-green">₹{overall.got.toFixed(0)}</div>
            <div className="summary-label">You got</div>
            {overall.gotInterest > 0 && (
              <div className="interest-subline">incl. ₹{overall.gotInterest.toFixed(0)} interest</div>
            )}
          </div>
        </div>
        <div className="summary-footer" onClick={() => setShowReportModal(true)}>
          Download Report
        </div>
      </div>

      <div className="search-bar">
        <input
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="customer-list">
        {loading && <div className="empty-state">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">No customers yet. Tap + to add one.</div>
        )}
        {!loading &&
          filtered.map((c) => (
            <div
              key={c._id}
              className="customer-row"
              onClick={() => navigate(`/customer/${c._id}`)}
            >
              <div className="customer-avatar">{c.name.charAt(0).toUpperCase()}</div>
              <div className="customer-info">
                <div className="customer-name">{c.name}</div>
                {c.email && <div className="customer-sub">{c.email}</div>}
              </div>
              <div className="customer-balance">
                {c.balance >= 0 ? (
                  <span className="amount-red">₹{Math.abs(c.balance).toFixed(0)}</span>
                ) : (
                  <span className="amount-green">₹{Math.abs(c.balance).toFixed(0)}</span>
                )}
                <div className="balance-label">
                  {c.balance >= 0 ? 'You will get' : 'You will give'}
                </div>
              </div>
            </div>
          ))}
      </div>

      <button className="fab" onClick={() => setShowAddModal(true)}>
        + <span className="fab-icon">&#128100;</span>
      </button>

      {showAddModal && (
        <AddCustomerModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
      )}

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}

      <SideDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        onLogout={logout}
      />
    </div>
  );
}