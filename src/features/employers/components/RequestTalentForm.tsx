"use client";

import { useEffect, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import {
  RadioGroupField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  contactFields,
  requestTalent,
  roleFields,
  salaryUnitOptions,
  serviceOptions,
  specialtyGroups,
  usStates,
  workModeOptions,
} from "@/content/request-talent";
import {
  submitRequisition,
  type RequisitionPayload,
} from "../queries";

/**
 * The requisition form.
 *
 * Accessibility, in one place so it can be checked against:
 *
 *   - a real <form> with a real <label> on every control, grouped into
 *     fieldsets with legends
 *   - `noValidate`, because the browser's own bubbles cannot be styled, are
 *     not reliably announced, and vanish on blur. We do the validating and
 *     render the messages into the page instead. The `required` and `min`
 *     attributes stay on the controls for semantics
 *   - failed submit renders an error summary with role="alert" listing every
 *     problem as a link to the control, and moves focus to it
 *   - each control gets aria-invalid and an aria-describedby pointing at its
 *     own message (see components/ui/Field.tsx)
 *   - success moves focus to the confirmation panel, so a keyboard or screen
 *     reader user is not left at the bottom of a form that has disappeared
 *
 * Spam handling is a honeypot plus a minimum time on page. Both only ever
 * fire on an OTHERWISE VALID submission, so a fast human filling the form
 * correctly is never silently dropped - see handleSubmit. The first catch
 * in a submission attempt is told it was not sent; a repeat is sent, marked,
 * and held for staff review, so a real person is never blocked for good.
 *
 * `open` comes from the page, which asks the forms gate at build time
 * (src/lib/supabase/forms-gate.ts). Closed, a valid submit says the form is
 * not open and sends nothing. Open, it goes to submitRequisition() in
 * ../queries.ts, the one place this form touches the database.
 *
 * Every outcome other than success keeps what was typed and takes focus.
 */

type FieldKey =
  | keyof typeof contactFields
  | keyof typeof roleFields;

type Values = Record<FieldKey, string>;

/** Why a submit did not get through, when it did not. */
type Outcome =
  | { kind: "unavailable" }
  | { kind: "failed" }
  | { kind: "rate_limited"; retryAfterSeconds: number | null };

function outcomeText(outcome: Outcome): string {
  switch (outcome.kind) {
    case "unavailable":
      return requestTalent.notOpen.afterSubmit;
    case "rate_limited":
      return requestTalent.outcome.rateLimited(outcome.retryAfterSeconds);
    case "failed":
      return requestTalent.outcome.failed;
  }
}

type FieldError = {
  key: FieldKey;
  /** The element the summary link should send focus to. */
  anchor: string;
  message: string;
};

const initialValues: Values = {
  fullName: "",
  workEmail: "",
  phone: "",
  companyName: "",
  contactJobTitle: "",
  roleTitle: "",
  service: "",
  specialty: "",
  city: "",
  state: "",
  workMode: "",
  positions: "1",
  startDate: "",
  salaryMin: "",
  salaryMax: "",
  salaryUnit: "",
  requirements: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PHONE_DIGITS = 10;

/** Local calendar date as YYYY-MM-DD, for the start-date floor. */
function todayIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Validates in DOM order, so the error summary reads in the same order as
 * the form itself.
 */
function validate(values: Values): FieldError[] {
  const errors: FieldError[] = [];
  const add = (key: FieldKey, anchor: string, message: string | undefined) => {
    if (message) errors.push({ key, anchor, message });
  };

  const required: FieldKey[] = [
    "fullName",
    "workEmail",
    "phone",
    "companyName",
    "roleTitle",
    "service",
    "specialty",
    "city",
    "state",
    "workMode",
    "positions",
  ];

  const missing = new Set<FieldKey>();
  for (const key of required) {
    if (values[key].trim() === "") missing.add(key);
  }

  // Contact block.
  if (missing.has("fullName")) {
    add("fullName", contactFields.fullName.id, contactFields.fullName.errorRequired);
  }
  if (missing.has("workEmail")) {
    add("workEmail", contactFields.workEmail.id, contactFields.workEmail.errorRequired);
  } else if (!EMAIL_PATTERN.test(values.workEmail.trim())) {
    add("workEmail", contactFields.workEmail.id, contactFields.workEmail.errorFormat);
  }
  if (missing.has("phone")) {
    add("phone", contactFields.phone.id, contactFields.phone.errorRequired);
  } else if ((values.phone.match(/\d/g) ?? []).length < MIN_PHONE_DIGITS) {
    add("phone", contactFields.phone.id, contactFields.phone.errorFormat);
  }
  if (missing.has("companyName")) {
    add("companyName", contactFields.companyName.id, contactFields.companyName.errorRequired);
  }

  // Role block.
  if (missing.has("roleTitle")) {
    add("roleTitle", roleFields.roleTitle.id, roleFields.roleTitle.errorRequired);
  }
  if (missing.has("service")) {
    add("service", roleFields.service.id, roleFields.service.errorRequired);
  }
  if (missing.has("specialty")) {
    add("specialty", roleFields.specialty.id, roleFields.specialty.errorRequired);
  }
  if (missing.has("city")) {
    add("city", roleFields.city.id, roleFields.city.errorRequired);
  }
  if (missing.has("state")) {
    add("state", roleFields.state.id, roleFields.state.errorRequired);
  }
  if (missing.has("workMode")) {
    // A fieldset cannot take focus, so the summary points at the first radio.
    add(
      "workMode",
      `${roleFields.workMode.id}-${workModeOptions[0].value}`,
      roleFields.workMode.errorRequired,
    );
  }

  const positions = Number(values.positions);
  if (missing.has("positions")) {
    add("positions", roleFields.positions.id, roleFields.positions.errorRequired);
  } else if (!Number.isInteger(positions) || positions < 1) {
    add("positions", roleFields.positions.id, roleFields.positions.errorFormat);
  }

  if (values.startDate !== "" && values.startDate < todayIsoDate()) {
    add("startDate", roleFields.startDate.id, roleFields.startDate.errorFormat);
  }

  // Compensation is optional, but a partial range is worse than none.
  const min = values.salaryMin.trim();
  const max = values.salaryMax.trim();
  const minNumber = Number(min);
  const maxNumber = Number(max);

  if (min !== "" && (!Number.isFinite(minNumber) || minNumber < 0)) {
    add("salaryMin", roleFields.salaryMin.id, roleFields.salaryMin.errorFormat);
  }
  if (max !== "" && (!Number.isFinite(maxNumber) || maxNumber < 0)) {
    add("salaryMax", roleFields.salaryMax.id, roleFields.salaryMax.errorFormat);
  } else if (
    min !== "" &&
    max !== "" &&
    Number.isFinite(minNumber) &&
    Number.isFinite(maxNumber) &&
    maxNumber < minNumber
  ) {
    add("salaryMax", roleFields.salaryMax.id, roleFields.salaryMax.errorFormat);
  }
  if ((min !== "" || max !== "") && values.salaryUnit === "") {
    add("salaryUnit", roleFields.salaryUnit.id, roleFields.salaryUnit.errorFormat);
  }

  return errors;
}

function toPayload(
  values: Values,
  submissionKey: string,
  trapTripped: boolean,
): RequisitionPayload {
  const min = values.salaryMin.trim();
  const max = values.salaryMax.trim();

  return {
    submissionKey,
    trapTripped,
    contact: {
      fullName: values.fullName.trim(),
      workEmail: values.workEmail.trim(),
      phone: values.phone.trim(),
      companyName: values.companyName.trim(),
      jobTitle: values.contactJobTitle.trim(),
    },
    role: {
      title: values.roleTitle.trim(),
      service: values.service,
      specialty: values.specialty,
      location: { city: values.city.trim(), state: values.state },
      workMode: values.workMode,
      positions: Number(values.positions),
      targetStartDate: values.startDate === "" ? null : values.startDate,
      compensation: {
        min: min === "" ? null : Number(min),
        max: max === "" ? null : Number(max),
        unit: values.salaryUnit === "" ? null : values.salaryUnit,
      },
      additionalRequirements: values.requirements.trim(),
    },
  };
}

export function RequestTalentForm({ open }: { open: boolean }) {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [honeypot, setHoneypot] = useState("");
  /** Bumped on every outcome, so focus moves even when it repeats. */
  const [outcomeCount, setOutcomeCount] = useState(0);

  /**
   * Incremented on every failed submit so the focus effect re-runs even when
   * the same errors come back a second time.
   */
  const [failedAttempts, setFailedAttempts] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLParagraphElement>(null);
  const openedAt = useRef<number | null>(null);
  /**
   * The current submission attempt. Its key is made on the first send and
   * resent on every retry, so the database stores a retried brief once
   * (migration 9). trapTrips counts spam-trap trips in this attempt: the
   * first is refused here and sends nothing; a repeat is sent, marked, and
   * held for staff review (migration 13), so a person is never blocked for
   * good. It lives only in this page's memory: nothing about a refusal is
   * sent or kept anywhere. Any edit starts a new attempt - changed content
   * must not be dropped as a retry of the old one.
   */
  const attempt = useRef<{ key: string; trapTrips: number } | null>(null);

  /**
   * Set after mount rather than at module scope: every page here is
   * statically prerendered, so a timestamp captured during render would be
   * the BUILD time - stale by the time anyone loads the page, and a
   * hydration mismatch besides.
   *
   * The same reasoning is why the date input carries no `min` attribute: a
   * prerendered floor would be frozen at build time and start rejecting
   * valid dates. `validate()` compares against the real current date at
   * submit time instead, which is the check that actually has to hold.
   */
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (failedAttempts > 0) summaryRef.current?.focus();
  }, [failedAttempts]);

  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (outcomeCount > 0) outcomeRef.current?.focus();
  }, [outcomeCount]);

  const setValue = (key: FieldKey) => (value: string) => {
    attempt.current = null;
    setValues((current) => ({ ...current, [key]: value }));
  };

  function showOutcome(next: Outcome) {
    setOutcome(next);
    setOutcomeCount((count) => count + 1);
  }

  const errorFor = (key: FieldKey) =>
    errors.find((error) => error.key === key)?.message;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values);
    if (found.length > 0) {
      setOutcome(null);
      setErrors(found);
      setFailedAttempts((count) => count + 1);
      return;
    }
    setErrors([]);

    if (!open) {
      showOutcome({ kind: "unavailable" });
      return;
    }

    // Spam checks run only on an otherwise valid submission. The first catch
    // in an attempt is answered as a failed send and sends nothing; a
    // repeat is sent marked, and held for review. See `attempt` above.
    const secondsOnPage = openedAt.current
      ? (Date.now() - openedAt.current) / 1000
      : 0;
    const looksAutomated =
      honeypot.trim() !== "" ||
      secondsOnPage < requestTalent.spam.minSubmitSeconds;

    attempt.current ??= { key: crypto.randomUUID(), trapTrips: 0 };
    const current = attempt.current;
    if (looksAutomated) {
      current.trapTrips += 1;
      if (current.trapTrips === 1) {
        showOutcome({ kind: "failed" });
        return;
      }
    }
    const trapTripped = current.trapTrips > 1;

    setStatus("sending");
    setOutcome(null);
    const result = await submitRequisition(toPayload(values, current.key, trapTripped));
    if (result.ok) {
      attempt.current = null;
      setStatus("sent");
      return;
    }
    setStatus("idle");
    showOutcome(
      result.reason === "rate_limited"
        ? { kind: "rate_limited", retryAfterSeconds: result.retryAfterSeconds }
        : { kind: "failed" },
    );
  }

  function handleReset() {
    setValues(initialValues);
    setErrors([]);
    setHoneypot("");
    setFailedAttempts(0);
    setStatus("idle");
    setOutcome(null);
    attempt.current = null;
    openedAt.current = Date.now();
    // Ids are owned by the content layer, so this cannot drift out of step.
    document.getElementById(contactFields.fullName.id)?.focus();
  }

  if (status === "sent") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-xl border border-brand bg-brand-soft p-6 sm:p-8"
      >
        <h2 className="text-2xl font-bold text-ink">
          {requestTalent.success.title}
        </h2>
        <p className="mt-4 text-base text-ink-muted">
          {requestTalent.success.body}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleReset}>{requestTalent.success.resetLabel}</Button>
          <ButtonLink href="/employers" variant="secondary">
            {requestTalent.success.backLabel}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-10">
      {/* Not sent, for whichever reason: say so, and keep what they typed. */}
      {outcome ? (
        <p
          ref={outcomeRef}
          tabIndex={-1}
          role="status"
          className="rounded-lg border border-brand bg-brand-soft p-5 text-base text-ink"
        >
          {outcomeText(outcome)}
        </p>
      ) : null}
      {errors.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-danger bg-danger-soft p-5"
        >
          <h2 className="flex items-start gap-2 text-lg font-bold text-danger">
            <Icon name="alert" className="mt-1 h-5 w-5 shrink-0" />
            {requestTalent.errorSummary.title}
          </h2>
          <p className="mt-2 text-base text-ink">
            {requestTalent.errorSummary.intro}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {errors.map((error) => (
              <li key={error.key}>
                <a
                  href={`#${error.anchor}`}
                  onClick={() => document.getElementById(error.anchor)?.focus()}
                  className="text-base font-semibold text-danger underline underline-offset-4"
                >
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-base text-ink-muted">
        {requestTalent.required.legend}
      </p>

      {/* ---------------------------------------------------- About you --- */}
      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {requestTalent.fieldsets.contact.legend}
        </legend>
        <p className="text-base text-ink-muted">
          {requestTalent.fieldsets.contact.hint}
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            field={contactFields.fullName}
            value={values.fullName}
            onChange={setValue("fullName")}
            error={errorFor("fullName")}
          />
          <TextField
            field={contactFields.workEmail}
            type="email"
            inputMode="email"
            value={values.workEmail}
            onChange={setValue("workEmail")}
            error={errorFor("workEmail")}
          />
          <TextField
            field={contactFields.phone}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={setValue("phone")}
            error={errorFor("phone")}
          />
          <TextField
            field={contactFields.companyName}
            value={values.companyName}
            onChange={setValue("companyName")}
            error={errorFor("companyName")}
          />
          <TextField
            field={contactFields.contactJobTitle}
            value={values.contactJobTitle}
            onChange={setValue("contactJobTitle")}
            error={errorFor("contactJobTitle")}
          />
        </div>
      </fieldset>

      {/* --------------------------------------------------- About the role */}
      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {requestTalent.fieldsets.role.legend}
        </legend>
        <p className="text-base text-ink-muted">
          {requestTalent.fieldsets.role.hint}
        </p>

        <TextField
          field={roleFields.roleTitle}
          value={values.roleTitle}
          onChange={setValue("roleTitle")}
          error={errorFor("roleTitle")}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            field={roleFields.service}
            value={values.service}
            onChange={setValue("service")}
            error={errorFor("service")}
            options={serviceOptions}
            placeholderLabel={requestTalent.selectPlaceholder}
          />
          <SelectField
            field={roleFields.specialty}
            value={values.specialty}
            onChange={setValue("specialty")}
            error={errorFor("specialty")}
            groups={specialtyGroups}
            placeholderLabel={requestTalent.selectPlaceholder}
          />
        </div>

        <fieldset>
          <legend className="text-base font-semibold text-ink">
            {requestTalent.location.legend}
          </legend>
          <p className="mt-1 text-sm text-ink-muted">
            {requestTalent.location.hint}
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <TextField
              field={roleFields.city}
              value={values.city}
              onChange={setValue("city")}
              error={errorFor("city")}
            />
            <SelectField
              field={roleFields.state}
              value={values.state}
              onChange={setValue("state")}
              error={errorFor("state")}
              options={usStates}
              placeholderLabel={requestTalent.selectPlaceholder}
            />
          </div>
        </fieldset>

        <RadioGroupField
          field={roleFields.workMode}
          value={values.workMode}
          onChange={setValue("workMode")}
          error={errorFor("workMode")}
          options={workModeOptions}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            field={roleFields.positions}
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={values.positions}
            onChange={setValue("positions")}
            error={errorFor("positions")}
          />
          <TextField
            field={roleFields.startDate}
            type="date"
            value={values.startDate}
            onChange={setValue("startDate")}
            error={errorFor("startDate")}
          />
        </div>
      </fieldset>

      {/* ----------------------------------------------- Salary / rate range */}
      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {requestTalent.fieldsets.compensation.legend}
        </legend>
        <p className="text-base text-ink-muted">
          {requestTalent.fieldsets.compensation.hint}
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          <TextField
            field={roleFields.salaryMin}
            type="number"
            inputMode="numeric"
            min="0"
            value={values.salaryMin}
            onChange={setValue("salaryMin")}
            error={errorFor("salaryMin")}
          />
          <TextField
            field={roleFields.salaryMax}
            type="number"
            inputMode="numeric"
            min="0"
            value={values.salaryMax}
            onChange={setValue("salaryMax")}
            error={errorFor("salaryMax")}
          />
          <SelectField
            field={roleFields.salaryUnit}
            value={values.salaryUnit}
            onChange={setValue("salaryUnit")}
            error={errorFor("salaryUnit")}
            options={salaryUnitOptions}
            placeholderLabel={requestTalent.selectPlaceholder}
          />
        </div>
      </fieldset>

      <TextareaField
        field={roleFields.requirements}
        value={values.requirements}
        onChange={setValue("requirements")}
        error={errorFor("requirements")}
      />

      {/*
        Honeypot. Off-screen via the .honeypot class in globals.css, hidden
        from assistive tech and removed from the tab order, so the only way it
        gets a value is a script filling every input it finds.
      */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor={requestTalent.spam.honeypotId}>
          {requestTalent.spam.honeypotLabel}
        </label>
        <input
          id={requestTalent.spam.honeypotId}
          name={requestTalent.spam.honeypotId}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="border-t border-border pt-8">
        <Button
          type="submit"
          size="lg"
          disabled={status === "sending"}
          className="w-full sm:w-auto"
        >
          {status === "sending"
            ? requestTalent.submit.busyLabel
            : requestTalent.submit.label}
        </Button>
        <p className="mt-4 text-sm text-ink-muted">
          {requestTalent.privacyNote}
        </p>
      </div>
    </form>
  );
}
