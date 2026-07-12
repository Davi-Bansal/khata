import { useState } from 'react';
import InfoModal from './InfoModal';

export default function SideDrawer({ open, onClose, user, onLogout }) {
  const [modal, setModal] = useState(null); // 'about-us' | 'about-app' | 'help' | 'settings' | null
  const [toast, setToast] = useState('');
  const [appName, setAppName] = useState(() => localStorage.getItem('appDisplayName') || 'Interest Book');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleRename = () => {
    const name = window.prompt('App name', appName);
    if (name && name.trim()) {
      setAppName(name.trim());
      localStorage.setItem('appDisplayName', name.trim());
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: appName,
      text: `Track loans, interest and payments easily with ${appName}.`,
      url: window.location.origin
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        // user cancelled the share sheet — do nothing
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link copied to clipboard');
      } catch (e) {
        showToast('Could not copy link');
      }
    }
  };

  const items = [
    { icon: 'ℹ️', label: 'About us', action: () => setModal('about-us') },
    { icon: '📱', label: 'About App', action: () => setModal('about-app') },
    { icon: '🔗', label: 'Share', action: handleShare },
    { icon: '⭐', label: 'Rate it', action: () => showToast('Thanks! Rating coming soon.') },
    { icon: '📋', label: 'More Apps', action: () => showToast('More apps coming soon.') },
    { icon: '❓', label: 'How to use app (Help)', action: () => setModal('help') }
  ];

  const handleItemClick = (action) => {
    action();
    onClose();
  };

  return (
    <>
      <div
        className={`drawer-overlay ${open ? 'drawer-overlay-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div className={`drawer-panel ${open ? 'drawer-panel-open' : ''}`}>
        <div className="drawer-header">
          <button className="drawer-edit-btn" onClick={handleRename} title="Rename app">
            ✏️
          </button>
          <div className="drawer-logo">📖</div>
          <div className="drawer-app-name">{appName}</div>
        </div>

        <nav className="drawer-nav">
          {items.map((item) => (
            <button
              key={item.label}
              className="drawer-item"
              onClick={() => handleItemClick(item.action)}
            >
              <span className="drawer-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="drawer-section-label">Settings</div>
        <nav className="drawer-nav">
          <button
            className="drawer-item"
            onClick={() => handleItemClick(() => setModal('settings'))}
          >
            <span className="drawer-item-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {toast && <div className="drawer-toast">{toast}</div>}

      {modal === 'about-us' && (
        <InfoModal title="About Us" onClose={() => setModal(null)}>
          <p>
            {appName} helps you keep track of money you've lent or borrowed, along with interest,
            all in one simple place — just like a traditional khata book, but digital.
          </p>
        </InfoModal>
      )}

      {modal === 'about-app' && (
        <InfoModal title="About App" onClose={() => setModal(null)}>
          <p style={{ marginBottom: 10 }}>
            <strong>{appName}</strong> v1.0
          </p>
          <p style={{ color: '#666', fontSize: 14 }}>
            Built with the MERN stack (MongoDB, Express, React, Node.js).
          </p>
        </InfoModal>
      )}

      {modal === 'help' && (
        <InfoModal title="How to use app" onClose={() => setModal(null)}>
          <ol className="drawer-help-list">
            <li>Tap the green + button to add a new customer.</li>
            <li>Open a customer to see their full ledger.</li>
            <li>
              Tap <strong>YOU GAVE</strong> or <strong>YOU GOT</strong> to add a transaction with
              amount, interest rate, and Simple/Compound interest type.
            </li>
            <li>Use <strong>Download Report</strong> on the home screen to export a PDF summary.</li>
          </ol>
        </InfoModal>
      )}

      {modal === 'settings' && (
        <InfoModal title="Settings" onClose={() => setModal(null)}>
          <div className="settings-user-row">
            <div className="profile-avatar-large">{user?.name?.charAt(0).toUpperCase() || '?'}</div>
            <div>
              <div className="profile-name">{user?.name}</div>
              <div className="profile-email">{user?.email}</div>
            </div>
          </div>
          <button className="profile-logout-btn" onClick={onLogout}>
            Logout
          </button>
        </InfoModal>
      )}
    </>
  );
}