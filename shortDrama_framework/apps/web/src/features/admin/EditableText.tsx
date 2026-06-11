import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent
} from "react";

export type EditableTextProps = {
  value: string;
  multiline?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onSave: (nextValue: string) => Promise<void> | void;
};

export function EditableText(props: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(props.value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(props.value);
  }, [props.value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  async function save() {
    const nextValue = draft.trim();
    if (!nextValue) {
      setError("内容不能为空");
      return;
    }

    if (nextValue === props.value.trim()) {
      setIsEditing(false);
      setError(null);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await props.onSave(nextValue);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    setDraft(props.value);
    setError(null);
    setIsEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }

    if (!props.multiline && event.key === "Enter") {
      event.preventDefault();
      void save();
      return;
    }

    if (props.multiline && event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      void save();
    }
  }

  if (!isEditing) {
    return (
      <span
        className={props.className}
        title={props.disabled ? undefined : "双击编辑"}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!props.disabled) {
            setIsEditing(true);
          }
        }}
      >
        {props.value || props.placeholder}
      </span>
    );
  }

  const commonProps = {
    ref: inputRef as never,
    value: draft,
    disabled: isSaving,
    className:
      "w-full rounded-2xl border border-amber-200/25 bg-black/45 px-3 py-2 text-amber-50 outline-none focus:border-amber-200/60",
    onClick: (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.currentTarget.value),
    onBlur: () => void save(),
    onKeyDown: handleKeyDown
  };

  return (
    <span className="block" onClick={(event) => event.stopPropagation()}>
      {props.multiline ? (
        <textarea {...commonProps} rows={3} />
      ) : (
        <input {...commonProps} type="text" />
      )}
      {error ? <span className="mt-1 block text-xs text-red-200">{error}</span> : null}
    </span>
  );
}
