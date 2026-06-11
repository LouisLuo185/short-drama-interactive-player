type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-5 backdrop-blur-sm">
      <div className="w-[min(460px,100%)] rounded-[1.5rem] border border-red-200/20 bg-[#180f0c] p-6 text-amber-50 shadow-2xl shadow-black/60">
        <h2 className="text-2xl font-black">{props.title}</h2>
        <p className="mt-3 leading-7 text-amber-50/70">{props.description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-amber-200/20 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-50/10"
            disabled={props.isLoading}
            onClick={props.onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={props.isLoading}
            onClick={props.onConfirm}
          >
            {props.isLoading ? "删除中" : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
