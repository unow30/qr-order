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
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[1000]" onClick={onCancel}>
      <div className="bg-white rounded-xl pt-7 px-6 pb-5 w-[360px] shadow-[0_8px_32px_rgba(0,0,0,0.18)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2.5 text-[17px] font-bold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-500 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button className="px-5 py-2 border border-gray-200 rounded-lg bg-white text-gray-500 cursor-pointer text-sm" onClick={onCancel}>취소</button>
          <button className="px-5 py-2 border-none rounded-lg bg-red-600 text-white cursor-pointer text-sm font-semibold" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
