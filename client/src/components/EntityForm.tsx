import { useState } from "react";

export type FormFieldType = "text" | "textarea" | "select" | "number";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  options?: FormFieldOption[];
  placeholder?: string;
}

interface EntityFormProps {
  fields: FormField[];
  initialValues?: Record<string, string>;
  submitLabel: string;
  onConfirm: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function EntityForm({
  fields,
  initialValues,
  submitLabel,
  onConfirm,
  onCancel,
}: EntityFormProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () =>
      initialValues ??
      Object.fromEntries(
        fields.map((f) => [f.key, f.options?.[0]?.value ?? ""]),
      ),
  );

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {fields.map((f) => (
        <div key={f.key}>
          <span className="label">{f.label}</span>
          {f.type === "textarea" ? (
            <textarea
              className="npc-edit__textarea"
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          ) : f.type === "select" ? (
            <select
              className="npc-edit__select npc-edit__select--native"
              value={values[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
            >
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="npc-edit__input"
              type={f.type === "number" ? "number" : "text"}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 4,
        }}
      >
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={() => onConfirm(values)}>
          {submitLabel}
        </button>
      </div>
    </>
  );
}
