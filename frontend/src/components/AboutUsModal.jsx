export default function AboutUsModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>About Us</span>
          <button className="link-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#333' }}>
            We are thankful to you for using this application. We request you to share this
            application with more people.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#333', marginTop: 12 }}>
            This app is created by <strong>Davi Bansal</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}