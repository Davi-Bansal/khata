export default function InfoModal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="link-btn" onClick={onClose}>
            CLOSE
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}