"use client";

import { useEffect, useState } from "react";
import { ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormFieldType =
  | "text"
  | "textarea"
  | "date"
  | "datetime"
  | "time"
  | "file_upload"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "dropdown_multi"
  | "slider"
  | "stepper"
  | "read_only";

export type FormFieldConfig = {
  id: string;
  label: string;
  type: FormFieldType;
  mandatory: boolean;
  characterLimit: number | null;
};

export type FormConfigValues = {
  sectionName: string;
  fieldsPerRow: number;
  fields: FormFieldConfig[];
};

interface FormConfigPanelProps {
  onChange: (values: FormConfigValues) => void;
  labels?: {
    section_name?: string;
    fields_per_row?: number;
    form_fields?: Array<{ label: string; type: FormFieldType; mandatory?: boolean; character_limit?: number | null }>;
  };
}

const FIELD_TYPES: { value: FormFieldType; label: string; description?: string }[] = [
  { value: "text", label: "Text", description: "Single-line text input" },
  { value: "textarea", label: "Textarea", description: "Multi-line text input (will take space for 2 fields)" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "time", label: "Time" },
  { value: "file_upload", label: "File Upload" },
  { value: "checkbox", label: "Checkbox", description: "Multi-select" },
  { value: "radio", label: "Radio", description: "Single select" },
  { value: "dropdown", label: "Dropdown" },
  { value: "dropdown_multi", label: "Dropdown", description: "Multi-select" },
  { value: "slider", label: "Slider" },
  { value: "stepper", label: "Stepper", description: "+/- number input" },
  { value: "read_only", label: "Read Only" },
];

export function FormConfigPanel({ onChange, labels }: FormConfigPanelProps) {
  const [step, setStep] = useState<"count" | "configure">("count");
  const [fieldCount, setFieldCount] = useState<string>("");
  const [sectionName, setSectionName] = useState<string>("");
  const [fieldsPerRow, setFieldsPerRow] = useState<string>("");
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const parsedFieldsPerRow = Number.parseInt(fieldsPerRow, 10);
  const fieldsPerRowValue = Number.isFinite(parsedFieldsPerRow) ? parsedFieldsPerRow : 2;

  function emitChange(nextFields: FormFieldConfig[], nextSectionName = sectionName, nextFieldsPerRow = fieldsPerRowValue) {
    onChange({
      sectionName: nextSectionName,
      fieldsPerRow: nextFieldsPerRow,
      fields: nextFields,
    });
  }

  function isTextareaPlacementAllowed(index: number, fieldId: string, currentFields: FormFieldConfig[], perRow: number) {
    if (perRow < 2) return false;
    
    // Check if this field is in a column that has room for a 2-column textarea
    // A textarea needs 2 consecutive columns, so it can only start in columns 0 to (perRow - 2)
    const column = index % perRow;
    if (column > perRow - 2) {
      return false; // Not enough columns left in this row
    }

    return true;
  }

  function getTextareaPlacementMessage(index: number, fieldId: string, currentFields: FormFieldConfig[], perRow: number) {
    if (currentFields.length <= perRow) {
      return "Textarea needs two continuous rows in the same column. Increase field count or reduce fields per row, then try again.";
    }

    let backwardSteps: number | null = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (isTextareaPlacementAllowed(i, fieldId, currentFields, perRow)) {
        backwardSteps = index - i;
        break;
      }
    }

    let forwardSteps: number | null = null;
    for (let i = index + 1; i < currentFields.length; i += 1) {
      if (isTextareaPlacementAllowed(i, fieldId, currentFields, perRow)) {
        forwardSteps = i - index;
        break;
      }
    }

    if (backwardSteps !== null && forwardSteps !== null) {
      return `Textarea needs two continuous rows in the same column. Choose a field ${backwardSteps} step(s) back or ${forwardSteps} step(s) forward.`;
    }
    if (backwardSteps !== null) {
      return `Textarea needs two continuous rows in the same column. Choose a field ${backwardSteps} step(s) back.`;
    }
    if (forwardSteps !== null) {
      return `Textarea needs two continuous rows in the same column. Choose a field ${forwardSteps} step(s) forward.`;
    }
    return "Textarea needs two continuous rows in the same column. No valid placement is available with the current layout.";
  }

  // Initialize from labels if provided
  useEffect(() => {
    if (labels?.form_fields) {
      const initialSectionName = labels.section_name ?? "";
      const initialFieldsPerRow = Number.isFinite(labels.fields_per_row)
        ? String(Math.max(2, Math.min(4, Number(labels.fields_per_row))))
        : "2";
      const initialFields = labels.form_fields.map((field, idx) => ({
        id: `field-${idx}`,
        label: field.label,
        type: field.type,
        mandatory: Boolean(field.mandatory),
        characterLimit:
          field.type === "textarea" && Number.isFinite(field.character_limit)
            ? Number(field.character_limit)
            : null,
      }));
      setSectionName(initialSectionName);
      setFieldsPerRow(initialFieldsPerRow);
      setFields(initialFields);
      setStep("configure");
      emitChange(initialFields, initialSectionName, Number.parseInt(initialFieldsPerRow, 10));
    }
  }, [labels]);

  function handleCountSubmit() {
    if (!sectionName.trim()) {
      alert("Please enter a section name");
      return;
    }
    const count = parseInt(fieldCount, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      alert("Please enter a number between 1 and 50");
      return;
    }
    const perRow = parseInt(fieldsPerRow, 10);
    if (isNaN(perRow) || perRow < 2 || perRow > 4) {
      alert("Please enter fields per row between 2 and 4");
      return;
    }

    const newFields: FormFieldConfig[] = Array.from({ length: count }, (_, idx) => ({
      id: `field-${idx}`,
      label: `Field ${idx + 1}`,
      type: "text",
      mandatory: false,
      characterLimit: null,
    }));

    setFields(newFields);
    emitChange(newFields, sectionName.trim(), perRow);
    setStep("configure");
  }

  function handleFieldUpdate(id: string, updates: Partial<FormFieldConfig>) {
    const updated = fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setFields(updated);
    emitChange(updated);
  }

  function handleFieldTypeChange(field: FormFieldConfig, index: number, nextType: FormFieldType) {
    if (nextType !== "textarea") {
      handleFieldUpdate(field.id, { type: nextType, characterLimit: null });
      return;
    }

    if (!isTextareaPlacementAllowed(index, field.id, fields, fieldsPerRowValue)) {
      alert(getTextareaPlacementMessage(index, field.id, fields, fieldsPerRowValue));
      return;
    }

    handleFieldUpdate(field.id, {
      type: nextType,
      characterLimit: field.characterLimit ?? 500,
    });
  }

  function handleAddField() {
    const newField: FormFieldConfig = {
      id: `field-${Date.now()}`,
      label: `Field ${fields.length + 1}`,
      type: "text",
      mandatory: false,
      characterLimit: null,
    };
    const updated = [...fields, newField];
    setFields(updated);
    emitChange(updated);
  }

  function handleRemoveField(id: string) {
    const updated = fields.filter((f) => f.id !== id);
    setFields(updated);
    emitChange(updated);
  }

  // Step 1: Count Input
  if (step === "count") {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Section Name</label>
          <p className="text-xs text-muted-foreground">Give your form section a name (e.g., "Contact Information")</p>
          <Input
            type="text"
            placeholder="Enter section name..."
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Number of Input Fields</label>
            <p className="text-xs text-muted-foreground">1-50 fields</p>
            <Input
              type="number"
              min="1"
              max="50"
              placeholder="Enter number..."
              value={fieldCount}
              onChange={(e) => setFieldCount(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Fields Per Row</label>
            <p className="text-xs text-muted-foreground">2-4 columns</p>
            <Input
              type="number"
              min="2"
              max="4"
              placeholder="Enter number..."
              value={fieldsPerRow}
              onChange={(e) => setFieldsPerRow(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <Button onClick={handleCountSubmit} className="w-full">
          Next
        </Button>
      </div>
    );
  }

  // Step 2: Configure Fields
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Form Fields Configuration</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {fields.length} field{fields.length !== 1 ? "s" : ""} configured · {fieldsPerRowValue} per row
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStep("count");
            setSectionName("");
            setFieldCount("");
            setFieldsPerRow("2");
          }}
          className="text-xs"
        >
          Change Settings
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {fields.map((field) => (
          <div
            key={field.id}
            className="rounded-lg border bg-secondary/30 overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedField(expandedField === field.id ? null : field.id)
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition"
            >
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">
                  {field.label || "Untitled"}
                  {field.mandatory && <span className="ml-1 text-red-500">*</span>}
                </div>
                <div className="text-xs text-muted-foreground">{field.type}</div>
                {field.type === "textarea" && field.characterLimit !== null && (
                  <div className="text-[11px] text-muted-foreground">Character limit: {field.characterLimit}</div>
                )}
              </div>
              <ChevronUp
                className={`h-4 w-4 transition-transform ${
                  expandedField === field.id ? "" : "rotate-180"
                }`}
              />
            </button>

            {expandedField === field.id && (
              <div className="px-4 py-4 border-t bg-card space-y-3">
                {/* Label Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Label
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter field label"
                    value={field.label}
                    onChange={(e) =>
                      handleFieldUpdate(field.id, { label: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>

                {/* Type Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Field Type
                  </label>
                  <select
                    value={field.type}
                    onChange={(e) =>
                      handleFieldTypeChange(field, fields.findIndex((item) => item.id === field.id), e.target.value as FormFieldType)
                    }
                    className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                        {ft.description ? ` — ${ft.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {field.type === "textarea" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Character Limit
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter max characters"
                      value={field.characterLimit ?? ""}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value, 10);
                        handleFieldUpdate(field.id, {
                          characterLimit: Number.isFinite(value) && value > 0 ? value : null,
                        });
                      }}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      This limit will be included in the generated component prompt.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Mandatory Field
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleFieldUpdate(field.id, { mandatory: !field.mandatory })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${field.mandatory ? "bg-primary" : "bg-white/20"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${field.mandatory ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {field.mandatory ? "Will show a red * next to this label in prompt output." : "Optional field"}
                  </p>
                </div>

                {/* Delete Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveField(field.id)}
                  className="w-full border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Field
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Field Button */}
      <Button
        variant="outline"
        onClick={handleAddField}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Field
      </Button>
    </div>
  );
}
