import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import type {
  FieldConfig,
  OptionGroup,
  SelectOption,
} from "@/content/request-talent";

/**
 * Form field primitives.
 *
 * These own layout and the accessibility wiring only. Every word they render
 * arrives in a `FieldConfig` from content/request-talent.ts.
 *
 * The wiring, applied identically by every control here:
 *
 *   label        a real <label htmlFor>, never a placeholder standing in for one
 *   required     the `required` attribute, plus a visible asterisk. The
 *                asterisk is aria-hidden because `required` already exposes
 *                the state to assistive tech; a form-level legend explains
 *                what the glyph means, so the marking is never colour alone
 *   hint         rendered under the label and referenced by aria-describedby
 *   error        rendered under the control, referenced by aria-describedby,
 *                and paired with aria-invalid. It carries a glyph as well as
 *                the danger colour, so an error is never signalled by colour
 *
 * Controls are 44px minimum height (WCAG 2.5.5 / 2.5.8) and nothing here
 * touches the outline: focus comes from the global :focus-visible rule.
 */

const REQUIRED_MARKER = "*";

const controlClass = [
  "block w-full min-h-11 rounded-md border bg-surface px-3 py-2.5",
  "text-base text-ink",
  "transition-colors duration-150",
].join(" ");

/**
 * Control border. --color-border-control, not --color-border-strong: the
 * boundary of an input has to clear 3:1 on its own (WCAG 1.4.11), because it
 * is the only thing that identifies the control.
 */
function stateClass(hasError: boolean): string {
  return hasError
    ? "border-danger hover:border-danger"
    : "border-border-control hover:border-brand";
}

/** Ids of the hint and error nodes a control should point at. */
function describedBy(
  field: FieldConfig,
  error: string | undefined,
): string | undefined {
  const ids = [
    field.hint ? `${field.id}-hint` : null,
    error ? `${field.id}-error` : null,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function FieldLabel({
  field,
  as: Tag = "label",
}: {
  field: FieldConfig;
  as?: "label" | "legend";
}) {
  return (
    <Tag
      {...(Tag === "label" ? { htmlFor: field.id } : {})}
      className="block text-base font-semibold text-ink"
    >
      {field.label}
      {field.required ? (
        <span aria-hidden="true" className="text-ink-muted">
          {" "}
          {REQUIRED_MARKER}
        </span>
      ) : null}
    </Tag>
  );
}

function Hint({ field }: { field: FieldConfig }) {
  if (!field.hint) return null;
  return (
    <p id={`${field.id}-hint`} className="mt-1 text-sm text-ink-muted">
      {field.hint}
    </p>
  );
}

function FieldError({
  field,
  error,
}: {
  field: FieldConfig;
  error: string | undefined;
}) {
  if (!error) return null;
  return (
    <p
      id={`${field.id}-error`}
      className="mt-2 flex items-start gap-2 text-sm font-semibold text-danger"
    >
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </p>
  );
}

/** Wrapper shared by every control: label, hint, control, error. */
function FieldShell({
  field,
  error,
  children,
}: {
  field: FieldConfig;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <Hint field={field} />
      <div className="mt-2">{children}</div>
      <FieldError field={field} error={error} />
    </div>
  );
}

export function TextField({
  field,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  min,
  step,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "url" | "password";
  inputMode?: "numeric" | "tel" | "email";
  min?: string;
  step?: string;
}) {
  return (
    <FieldShell field={field} error={error}>
      <input
        id={field.id}
        name={field.id}
        type={type}
        inputMode={inputMode}
        min={min}
        step={step}
        value={value}
        required={field.required}
        autoComplete={field.autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} ${stateClass(Boolean(error))}`}
      />
    </FieldShell>
  );
}

export function TextareaField({
  field,
  value,
  onChange,
  error,
  rows = 5,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rows?: number;
}) {
  return (
    <FieldShell field={field} error={error}>
      <textarea
        id={field.id}
        name={field.id}
        rows={rows}
        value={value}
        required={field.required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} ${stateClass(Boolean(error))}`}
      />
    </FieldShell>
  );
}

/**
 * Select. Pass either flat `options` or grouped `groups` (rendered as
 * <optgroup>, which is how a grouped select stays navigable by keyboard and
 * announces its group name).
 *
 * The empty first option is the unselected state: without it the browser
 * pre-selects the first real option and a required select can be submitted
 * with a value the user never chose.
 */
export function SelectField({
  field,
  value,
  onChange,
  error,
  options,
  groups,
  placeholderLabel,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  options?: SelectOption[];
  groups?: OptionGroup[];
  placeholderLabel: string;
}) {
  return (
    <FieldShell field={field} error={error}>
      <select
        id={field.id}
        name={field.id}
        value={value}
        required={field.required}
        autoComplete={field.autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(field, error)}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClass} ${stateClass(Boolean(error))}`}
      >
        <option value="">{placeholderLabel}</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {groups?.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </FieldShell>
  );
}

/**
 * Radio group. A fieldset with a legend is the only correct grouping for a
 * set of radios: it gives the group an accessible name, so a screen reader
 * announces "Work mode, Onsite, 1 of 3" rather than just "Onsite".
 *
 * The error and hint are described by the fieldset via aria-describedby, and
 * each radio points at its own option hint.
 */
export function RadioGroupField({
  field,
  value,
  onChange,
  error,
  options,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  options: { value: string; label: string; hint: string }[];
}) {
  return (
    <fieldset
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(field, error)}
    >
      <FieldLabel field={field} as="legend" />
      <Hint field={field} />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const optionId = `${field.id}-${option.value}`;
          return (
            <div
              key={option.value}
              className={[
                "flex min-h-11 items-start gap-3 rounded-md border bg-surface p-3",
                "transition-colors duration-150",
                value === option.value
                  ? "border-brand bg-brand-soft"
                  : stateClass(Boolean(error)),
              ].join(" ")}
            >
              <input
                id={optionId}
                name={field.id}
                type="radio"
                value={option.value}
                checked={value === option.value}
                required={field.required}
                aria-describedby={`${optionId}-hint`}
                onChange={() => onChange(option.value)}
                className="mt-1 h-5 w-5 shrink-0 accent-brand"
              />
              <span className="flex flex-col">
                <label
                  htmlFor={optionId}
                  className="text-base font-semibold text-ink"
                >
                  {option.label}
                </label>
                <span
                  id={`${optionId}-hint`}
                  className="text-sm text-ink-muted"
                >
                  {option.hint}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <FieldError field={field} error={error} />
    </fieldset>
  );
}

/**
 * Single checkbox, for a consent statement or any standalone yes/no opt-in.
 *
 * The label carries the full sentence, so it is normal weight rather than the
 * semibold used for short field labels, and the whole sentence is the click
 * target. A required checkbox gets the `required` attribute and the same
 * asterisk convention as every other required control.
 */
export function CheckboxField({
  field,
  checked,
  onChange,
  error,
}: {
  field: FieldConfig;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <div
        className={[
          "flex items-start gap-3 rounded-md border bg-surface p-4",
          "transition-colors duration-150",
          checked ? "border-brand bg-brand-soft" : stateClass(Boolean(error)),
        ].join(" ")}
      >
        <input
          id={field.id}
          name={field.id}
          type="checkbox"
          checked={checked}
          required={field.required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(field, error)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-brand"
        />
        <span className="flex flex-col">
          <label htmlFor={field.id} className="text-base text-ink">
            {field.label}
            {field.required ? (
              <span aria-hidden="true" className="text-ink-muted">
                {" "}
                {REQUIRED_MARKER}
              </span>
            ) : null}
          </label>
          {field.hint ? (
            <span id={`${field.id}-hint`} className="mt-1 text-sm text-ink-muted">
              {field.hint}
            </span>
          ) : null}
        </span>
      </div>
      <FieldError field={field} error={error} />
    </div>
  );
}

/**
 * Checkbox group: several independent choices under one legend.
 *
 * Checkboxes rather than a multi-select listbox, because a native
 * multi-select is close to unusable with a keyboard or a screen reader and
 * invisible to most people on a phone. A fieldset gives the group its
 * accessible name.
 */
export function CheckboxGroupField({
  field,
  values,
  onToggle,
  error,
  options,
}: {
  field: FieldConfig;
  values: string[];
  onToggle: (value: string, checked: boolean) => void;
  error?: string;
  options: SelectOption[];
}) {
  return (
    <fieldset
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(field, error)}
    >
      <FieldLabel field={field} as="legend" />
      <Hint field={field} />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const optionId = `${field.id}-${option.value}`;
          const checked = values.includes(option.value);
          return (
            <div
              key={option.value}
              className={[
                "flex min-h-11 items-center gap-3 rounded-md border bg-surface p-3",
                "transition-colors duration-150",
                checked ? "border-brand bg-brand-soft" : stateClass(Boolean(error)),
              ].join(" ")}
            >
              <input
                id={optionId}
                name={field.id}
                type="checkbox"
                value={option.value}
                checked={checked}
                onChange={(event) => onToggle(option.value, event.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
              <label
                htmlFor={optionId}
                className="text-base font-semibold text-ink"
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>

      <FieldError field={field} error={error} />
    </fieldset>
  );
}

/**
 * File input.
 *
 * `accept` is a hint to the file picker and nothing more - it is trivially
 * bypassed, so the accepted types and the size limit are also stated in
 * visible text beside the control and enforced in validation.
 *
 * The control is uncontrolled, because a file input's value cannot be set
 * programmatically. `inputRef` belongs to the parent so that resetting the
 * form can clear the picker; the Remove button uses the same ref.
 */
export function FileField({
  field,
  file,
  onChange,
  error,
  accept,
  constraintText,
  chosenLabel,
  clearLabel,
  inputRef,
}: {
  field: FieldConfig;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  accept: string;
  constraintText: string;
  chosenLabel: string;
  clearLabel: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const constraintId = `${field.id}-constraint`;
  const described = [
    constraintId,
    field.hint ? `${field.id}-hint` : null,
    error ? `${field.id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <FieldLabel field={field} />
      <Hint field={field} />

      <p id={constraintId} className="mt-1 text-sm text-ink-muted">
        {constraintText}
      </p>

      <input
        ref={inputRef}
        id={field.id}
        name={field.id}
        type="file"
        accept={accept}
        required={field.required}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className={[
          "mt-2 block w-full rounded-md border bg-surface p-3 text-base text-ink",
          "file:mr-4 file:min-h-11 file:rounded-md file:border-0 file:bg-brand",
          "file:px-4 file:py-2 file:text-base file:font-semibold file:text-white",
          "hover:file:bg-brand-strong",
          stateClass(Boolean(error)),
        ].join(" ")}
      />

      {file ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink">
          <span className="font-semibold">{chosenLabel}</span>
          <span>{file.name}</span>
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onChange(null);
            }}
            className="min-h-11 font-semibold text-brand underline underline-offset-4 hover:text-brand-strong"
          >
            {clearLabel}
          </button>
        </p>
      ) : null}

      <FieldError field={field} error={error} />
    </div>
  );
}
