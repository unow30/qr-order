interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = '삭제',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onCancel}>취소</button>
          <button style={styles.confirmBtn} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#fff',
    borderRadius: 12,
    padding: '28px 24px 20px',
    width: 360,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  title: {
    margin: '0 0 10px',
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  message: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#555',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '8px 20px',
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    color: '#555',
    cursor: 'pointer',
    fontSize: 14,
  },
  confirmBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: 8,
    background: '#e53935',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
};
