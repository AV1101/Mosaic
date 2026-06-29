"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/services/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconSlotValue = {
  iconName: string;
  variant: string;
  variants: string[];
};

export type IconTextSlotValue = {
  includeIcon: boolean;
  iconName: string;
  variant: string;
  variants: string[];
  text: string;
};

export type TableMode = "light" | "dark";
export type TableValueType = "text" | "numerical";

export type TableConfigValue = {
  mode: TableMode;
  valueType: TableValueType;
  rows: number;
  cols: number;
  matrix: string[][];
};

export type InputConfigValues = {
  textFields: string[];
  iconOnlySlots: IconSlotValue[];
  iconTextSlots: IconTextSlotValue[];
  tableConfig?: TableConfigValue;
};

type IconSearchResult = {
  id: number;
  name: string;
  variants: string[];
};

const VARIANT_CLASS: Record<string, string> = {
  filled: "material-icons",
  outlined: "material-icons-outlined",
  rounded: "material-icons-round",
  sharp: "material-icons-sharp",
  two_tone: "material-icons-two-tone",
};

function iconClass(variant: string): string {
  return VARIANT_CLASS[variant] ?? "material-icons";
}

interface FieldLabels {
  text_fields?: string[];
  icon_slots?: string[];
  image_fields?: string[];
  icon_text_slots?: string[];
}

interface InputConfigPanelProps {
  textOnly: number;
  iconOnly: number;
  iconText: number;
  onChange: (values: InputConfigValues) => void;
  labels?: FieldLabels;
  componentCategory?: string;
}

// ---------------------------------------------------------------------------
// Icon search combobox
// ---------------------------------------------------------------------------

function IconCombobox({
  value,
  onChange,
}: {
  value: IconSlotValue;
  onChange: (v: IconSlotValue) => void;
}) {
  const [query, setQuery] = useState(value.iconName);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<IconSearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      apiFetch<IconSearchResult[]>(`/icons?search=${encodeURIComponent(query)}&limit=20`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectIcon(icon: IconSearchResult) {
    setQuery(icon.name);
    setOpen(false);
    onChange({ iconName: icon.name, variant: icon.variants[0] ?? "", variants: icon.variants });
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          placeholder="Search icon name…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange({ iconName: "", variant: "", variants: [] });
          }}
          onFocus={() => query && setOpen(true)}
          className="pr-8"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border bg-card shadow-lg">
          {results.map((icon) => (
            <li
              key={icon.id}
              onMouseDown={() => selectIcon(icon)}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
            >
              <span className="material-icons text-base leading-none">{icon.name}</span>
              <span>{icon.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icon slot (used by Section B and C)
// ---------------------------------------------------------------------------

function IconSlot({
  slot,
  onChange,
  disabled,
}: {
  slot: IconSlotValue;
  onChange: (v: IconSlotValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      {slot.iconName && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/30 px-3 py-1.5">
          <span className={`${iconClass(slot.variant)} text-2xl leading-none`}>{slot.iconName}</span>
          <span className="text-xs text-muted-foreground">{slot.iconName}</span>
        </div>
      )}
      <IconCombobox value={slot} onChange={onChange} />
      <select
        value={slot.variant}
        disabled={disabled || slot.variants.length === 0}
        onChange={(e) => onChange({ ...slot, variant: e.target.value })}
        className="h-9 w-full rounded-xl border bg-background px-3 text-sm disabled:opacity-40"
      >
        {slot.variants.length === 0 ? (
          <option value="">Select icon first</option>
        ) : (
          slot.variants.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

function makeIconSlot(): IconSlotValue {
  return { iconName: "", variant: "", variants: [] };
}

function makeIconTextSlot(): IconTextSlotValue {
  return { includeIcon: true, iconName: "", variant: "", variants: [], text: "" };
}

function normalizeSize(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 20);
}

function buildMatrix(rows: number, cols: number, previous: string[][]): string[][] {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => previous[rowIndex]?.[colIndex] ?? "")
  );
}

export function InputConfigPanel({
  textOnly,
  iconOnly,
  iconText,
  onChange,
  labels,
  componentCategory,
}: InputConfigPanelProps) {
  const [textFields, setTextFields] = useState<string[]>(() => Array(textOnly).fill(""));
  const [iconOnlySlots, setIconOnlySlots] = useState<IconSlotValue[]>(() =>
    Array.from({ length: iconOnly }, makeIconSlot)
  );
  const [iconTextSlots, setIconTextSlots] = useState<IconTextSlotValue[]>(() =>
    Array.from({ length: iconText }, makeIconTextSlot)
  );

  const isTableComponent = componentCategory?.toLowerCase() === "table";

  const [tableMode, setTableMode] = useState<TableMode>("light");
  const [tableValueType, setTableValueType] = useState<TableValueType>("text");
  const [rowInput, setRowInput] = useState("4");
  const [colInput, setColInput] = useState("5");
  const [tableRows, setTableRows] = useState(4);
  const [tableCols, setTableCols] = useState(5);
  const [tableMatrix, setTableMatrix] = useState<string[][]>(() =>
    Array.from({ length: 4 }, () => Array(5).fill(""))
  );
  const [showMatrixEditor, setShowMatrixEditor] = useState(false);

  function applyTableDimensions() {
    const nextRows = normalizeSize(rowInput);
    const nextCols = normalizeSize(colInput);
    setTableRows(nextRows);
    setTableCols(nextCols);
    setTableMatrix((prev) => buildMatrix(nextRows, nextCols, prev));
    setShowMatrixEditor(true);
  }

  useEffect(() => {
    onChange({
      textFields,
      iconOnlySlots,
      iconTextSlots,
      tableConfig: isTableComponent
        ? {
            mode: tableMode,
            valueType: tableValueType,
            rows: tableRows,
            cols: tableCols,
            matrix: tableMatrix,
          }
        : undefined,
    });
  }, [
    textFields,
    iconOnlySlots,
    iconTextSlots,
    onChange,
    isTableComponent,
    tableMode,
    tableValueType,
    tableRows,
    tableCols,
    tableMatrix,
  ]);

  if (isTableComponent) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Table Setup
          </h4>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mode</label>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTableMode(mode)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    tableMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20 bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  {mode === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="flex gap-2">
              {(["text", "numerical"] as const).map((valueType) => (
                <button
                  key={valueType}
                  type="button"
                  onClick={() => setTableValueType(valueType)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    tableValueType === valueType
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/20 bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  {valueType === "text" ? "Text" : "Numerical"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">No. of rows</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={rowInput}
                onChange={(e) => setRowInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">No. of columns</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={colInput}
                onChange={(e) => setColInput(e.target.value)}
              />
            </div>
          </div>

          <Button type="button" onClick={applyTableDimensions} className="w-full sm:w-auto">
            Next
          </Button>
        </div>

        {showMatrixEditor && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Table Matrix ({tableRows} x {tableCols})
              </h4>
              <button
                type="button"
                onClick={() => setShowMatrixEditor(false)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Edit setup
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 p-3">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${tableCols}, minmax(120px, 1fr))` }}
              >
                {tableMatrix.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <Input
                      key={`${rowIndex}-${colIndex}`}
                      value={cell}
                      type="text"
                      inputMode="text"
                      placeholder={`R${rowIndex + 1} C${colIndex + 1}`}
                      onChange={(e) => {
                        const next = tableMatrix.map((r) => [...r]);
                        next[rowIndex][colIndex] = e.target.value;
                        setTableMatrix(next);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Section A — Text fields */}
        {textOnly > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Text Fields
            </h4>
            {textFields.map((val, i) => {
              const lbl = labels?.text_fields?.[i] || `T${i + 1}`;
              return (
                <div key={i} className="space-y-1.5">
                  <label className="text-sm font-medium">{lbl}</label>
                  <Input
                    value={val}
                    placeholder={lbl}
                    onChange={(e) => {
                      const updated = [...textFields];
                      updated[i] = e.target.value;
                      setTextFields(updated);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Section B — Icon only */}
        {iconOnly > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Icon Slots
            </h4>
            {iconOnlySlots.map((slot, i) => (
              <div key={i} className="space-y-1.5">
                <label className="text-sm font-medium">{labels?.icon_slots?.[i] || `I${i + 1}`}</label>
                <IconSlot
                  slot={slot}
                  onChange={(v) => {
                    const updated = [...iconOnlySlots];
                    updated[i] = v;
                    setIconOnlySlots(updated);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Section C — Icon + Text */}
        {iconText > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Icon + Text Slots
            </h4>
            {iconTextSlots.map((slot, i) => (
              <div key={i} className="space-y-2 rounded-xl border bg-secondary/20 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{labels?.icon_text_slots?.[i] || `IT${i + 1}`}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...iconTextSlots];
                      updated[i] = { ...slot, includeIcon: !slot.includeIcon };
                      setIconTextSlots(updated);
                    }}
                    className={`flex h-6 w-11 items-center rounded-full transition-colors ${
                      slot.includeIcon ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`mx-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        slot.includeIcon ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Include Icon: {slot.includeIcon ? "On" : "Off"}
                </p>
                <IconSlot
                  slot={slot}
                  disabled={!slot.includeIcon}
                  onChange={(v) => {
                    const updated = [...iconTextSlots];
                    updated[i] = { ...slot, ...v };
                    setIconTextSlots(updated);
                  }}
                />
                <Input
                  value={slot.text}
                  placeholder={labels?.icon_text_slots?.[i] || "Enter text…"}
                  onChange={(e) => {
                    const updated = [...iconTextSlots];
                    updated[i] = { ...slot, text: e.target.value };
                    setIconTextSlots(updated);
                  }}
                />
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
