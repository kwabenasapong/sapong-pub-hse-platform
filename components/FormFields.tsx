export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-stone-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
      />
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-stone-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextareaField({
  label,
  name,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="w-full border border-stone-200 rounded px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 resize-none"
      />
    </div>
  );
}

export function FormActions({ onClose, submitting }: { onClose: () => void; submitting?: boolean }) {
  return (
    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-100">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 font-medium transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-400 text-stone-900 font-medium rounded transition-colors disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
