"use client";

interface Props {
  stages: readonly string[];
  value: string;
  onChange: (stage: string) => void;
  disabled?: boolean;
}

// Tap-to-move: een simpele select werkt betrouwbaar op de telefoon
// (in tegenstelling tot drag-and-drop).
export default function StagePicker({
  stages,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <select
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-mg-green focus:outline-none focus:ring-2 focus:ring-mg-green/20 disabled:opacity-50"
    >
      {stages.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
