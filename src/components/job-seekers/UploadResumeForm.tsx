"use client";

import { useEffect, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import {
  CheckboxField,
  CheckboxGroupField,
  FileField,
  RadioGroupField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { JOB_SEEKERS_PATH } from "@/content/job-seekers";
import { usStates } from "@/content/request-talent";
import {
  aboutYouFields,
  consentFields,
  engagementTypeOptions,
  resumeFile,
  specialtyGroups,
  uploadResume,
  workAuthorizationOptions,
  workFields,
} from "@/content/upload-resume";
import {
  submitApplication,
  type ApplicationPayload,
} from "@/lib/job-seekers";

/**
 * The resume upload form.
 *
 * Same accessibility contract as the requisition form on
 * /employers/request-talent, deliberately: a real <form noValidate>, a real
 * <label> on every control, fieldsets with legends, an error summary with
 * role="alert" that takes focus, per-field aria-invalid and
 * aria-describedby, and 44px minimum targets. See components/ui/Field.tsx.
 *
 * Spam handling is a honeypot plus a minimum time on page, and both run only
 * AFTER validation passes, so a fast human filling the form correctly is
 * never silently dropped.
 *
 * Two things this form deliberately does not do:
 *
 *   - no EEO or demographic fields, and no visa-type field behind the work
 *     authorization question. See content/upload-resume.ts.
 *   - no upload pipeline. The File is carried in the payload and
 *     submitApplication() in lib/job-seekers.ts is the single seam where a
 *     presigned upload gets wired in.
 */

type TextKey =
  | keyof typeof aboutYouFields
  | "linkedinUrl"
  | "message"
  | "specialty"
  | "workAuthorization";

type FieldKey = TextKey | "engagementTypes" | "resume" | keyof typeof consentFields;

type FieldError = {
  key: FieldKey;
  /** The element the summary link should send focus to. */
  anchor: string;
  message: string;
};

type Values = Record<TextKey, string>;

const initialValues: Values = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  specialty: "",
  workAuthorization: "",
  linkedinUrl: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PHONE_DIGITS = 10;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return resumeFile.acceptedExtensions.some((ext) => lower.endsWith(ext));
}

/**
 * Validates in DOM order, so the error summary reads in the same order as
 * the form itself.
 */
function validate(
  values: Values,
  engagementTypes: string[],
  resume: File | null,
  consents: { storeAndContact: boolean; futureRoles: boolean },
): FieldError[] {
  const errors: FieldError[] = [];
  const add = (key: FieldKey, anchor: string, message: string | undefined) => {
    if (message) errors.push({ key, anchor, message });
  };

  // About you.
  if (values.fullName.trim() === "") {
    add("fullName", aboutYouFields.fullName.id, aboutYouFields.fullName.errorRequired);
  }
  if (values.email.trim() === "") {
    add("email", aboutYouFields.email.id, aboutYouFields.email.errorRequired);
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    add("email", aboutYouFields.email.id, aboutYouFields.email.errorFormat);
  }
  if (values.phone.trim() === "") {
    add("phone", aboutYouFields.phone.id, aboutYouFields.phone.errorRequired);
  } else if ((values.phone.match(/\d/g) ?? []).length < MIN_PHONE_DIGITS) {
    add("phone", aboutYouFields.phone.id, aboutYouFields.phone.errorFormat);
  }
  if (values.city.trim() === "") {
    add("city", aboutYouFields.city.id, aboutYouFields.city.errorRequired);
  }
  if (values.state === "") {
    add("state", aboutYouFields.state.id, aboutYouFields.state.errorRequired);
  }

  // The work you want.
  if (values.specialty === "") {
    add("specialty", workFields.specialty.id, workFields.specialty.errorRequired);
  }
  if (values.workAuthorization === "") {
    // A fieldset cannot take focus, so the summary points at the first radio.
    add(
      "workAuthorization",
      `${workFields.workAuthorization.id}-${workAuthorizationOptions[0].value}`,
      workFields.workAuthorization.errorRequired,
    );
  }
  if (engagementTypes.length === 0) {
    add(
      "engagementTypes",
      `${workFields.engagementTypes.id}-${engagementTypeOptions[0].value}`,
      workFields.engagementTypes.errorRequired,
    );
  }

  if (!resume) {
    add("resume", workFields.resume.id, workFields.resume.errorRequired);
  } else if (!hasAcceptedExtension(resume.name)) {
    add("resume", workFields.resume.id, resumeFile.errorType);
  } else if (resume.size > resumeFile.maxBytes) {
    add("resume", workFields.resume.id, resumeFile.errorSize);
  }

  if (values.linkedinUrl.trim() !== "" && !isHttpUrl(values.linkedinUrl.trim())) {
    add("linkedinUrl", workFields.linkedinUrl.id, workFields.linkedinUrl.errorFormat);
  }

  // Consent. The second box is optional by design and is never validated.
  if (!consents.storeAndContact) {
    add(
      "storeAndContact",
      consentFields.storeAndContact.id,
      consentFields.storeAndContact.errorRequired,
    );
  }

  return errors;
}

export function UploadResumeForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [engagementTypes, setEngagementTypes] = useState<string[]>([]);
  const [resume, setResume] = useState<File | null>(null);
  const [consents, setConsents] = useState({
    storeAndContact: false,
    futureRoles: false,
  });

  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [honeypot, setHoneypot] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const openedAt = useRef<number | null>(null);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (failedAttempts > 0) summaryRef.current?.focus();
  }, [failedAttempts]);

  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const setValue = (key: TextKey) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const errorFor = (key: FieldKey) =>
    errors.find((error) => error.key === key)?.message;

  function toggleEngagementType(value: string, checked: boolean) {
    setEngagementTypes((current) =>
      checked
        ? [...current, value]
        : current.filter((entry) => entry !== value),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values, engagementTypes, resume, consents);
    if (found.length > 0) {
      setErrors(found);
      setFailedAttempts((count) => count + 1);
      return;
    }
    setErrors([]);

    // Unreachable: validate() reports a missing resume. Here to narrow the
    // type for the payload below, rather than assert one.
    if (!resume) return;

    // Both checks run only on an otherwise valid submission, and both fail
    // closed into the success state: a bot gets no signal it was caught.
    const secondsOnPage = openedAt.current
      ? (Date.now() - openedAt.current) / 1000
      : 0;
    const looksAutomated =
      honeypot.trim() !== "" ||
      secondsOnPage < uploadResume.spam.minSubmitSeconds;

    if (looksAutomated) {
      setStatus("sent");
      return;
    }

    const payload: ApplicationPayload = {
      submittedAt: new Date().toISOString(),
      applicant: {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        location: { city: values.city.trim(), state: values.state },
        linkedinUrl: values.linkedinUrl.trim(),
        message: values.message.trim(),
      },
      preferences: {
        specialty: values.specialty,
        workAuthorization: values.workAuthorization,
        engagementTypes,
      },
      consent: { ...consents },
      resume,
    };

    setStatus("sending");
    const result = await submitApplication(payload);
    setStatus(result.ok ? "sent" : "idle");
  }

  function handleReset() {
    setValues(initialValues);
    setEngagementTypes([]);
    setResume(null);
    setConsents({ storeAndContact: false, futureRoles: false });
    setErrors([]);
    setHoneypot("");
    setFailedAttempts(0);
    setStatus("idle");
    openedAt.current = Date.now();
    // A file input's value cannot be set in React, so clear it directly.
    if (resumeInputRef.current) resumeInputRef.current.value = "";
    // Ids are owned by the content layer, so this cannot drift out of step.
    document.getElementById(aboutYouFields.fullName.id)?.focus();
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
          {uploadResume.success.title}
        </h2>
        <p className="mt-4 text-base text-ink-muted">
          {uploadResume.success.body}
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          {uploadResume.success.note}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleReset}>{uploadResume.success.resetLabel}</Button>
          <ButtonLink href={JOB_SEEKERS_PATH} variant="secondary">
            {uploadResume.success.backLabel}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-10">
      {errors.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-danger bg-danger-soft p-5"
        >
          <h2 className="flex items-start gap-2 text-lg font-bold text-danger">
            <Icon name="alert" className="mt-1 h-5 w-5 shrink-0" />
            {uploadResume.errorSummary.title}
          </h2>
          <p className="mt-2 text-base text-ink">
            {uploadResume.errorSummary.intro}
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

      <p className="text-base text-ink-muted">{uploadResume.required.legend}</p>

      {/* ---------------------------------------------------- About you --- */}
      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {uploadResume.fieldsets.aboutYou.legend}
        </legend>
        <p className="text-base text-ink-muted">
          {uploadResume.fieldsets.aboutYou.hint}
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            field={aboutYouFields.fullName}
            value={values.fullName}
            onChange={setValue("fullName")}
            error={errorFor("fullName")}
          />
          <TextField
            field={aboutYouFields.email}
            type="email"
            inputMode="email"
            value={values.email}
            onChange={setValue("email")}
            error={errorFor("email")}
          />
          <TextField
            field={aboutYouFields.phone}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={setValue("phone")}
            error={errorFor("phone")}
          />
        </div>

        <fieldset>
          <legend className="text-base font-semibold text-ink">
            {uploadResume.location.legend}
          </legend>
          <p className="mt-1 text-sm text-ink-muted">
            {uploadResume.location.hint}
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <TextField
              field={aboutYouFields.city}
              value={values.city}
              onChange={setValue("city")}
              error={errorFor("city")}
            />
            <SelectField
              field={aboutYouFields.state}
              value={values.state}
              onChange={setValue("state")}
              error={errorFor("state")}
              options={usStates}
              placeholderLabel={uploadResume.selectPlaceholder}
            />
          </div>
        </fieldset>
      </fieldset>

      {/* ----------------------------------------------- The work you want */}
      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {uploadResume.fieldsets.work.legend}
        </legend>
        <p className="text-base text-ink-muted">
          {uploadResume.fieldsets.work.hint}
        </p>

        <SelectField
          field={workFields.specialty}
          value={values.specialty}
          onChange={setValue("specialty")}
          error={errorFor("specialty")}
          groups={specialtyGroups}
          placeholderLabel={uploadResume.selectPlaceholder}
        />

        <RadioGroupField
          field={workFields.workAuthorization}
          value={values.workAuthorization}
          onChange={setValue("workAuthorization")}
          error={errorFor("workAuthorization")}
          options={workAuthorizationOptions}
        />

        <CheckboxGroupField
          field={workFields.engagementTypes}
          values={engagementTypes}
          onToggle={toggleEngagementType}
          error={errorFor("engagementTypes")}
          options={engagementTypeOptions}
        />

        <FileField
          field={workFields.resume}
          file={resume}
          onChange={setResume}
          error={errorFor("resume")}
          accept={resumeFile.acceptAttribute}
          constraintText={resumeFile.constraintText}
          chosenLabel={resumeFile.chosenLabel}
          clearLabel={resumeFile.clearLabel}
          inputRef={resumeInputRef}
        />

        <TextField
          field={workFields.linkedinUrl}
          type="url"
          value={values.linkedinUrl}
          onChange={setValue("linkedinUrl")}
          error={errorFor("linkedinUrl")}
        />

        <TextareaField
          field={workFields.message}
          value={values.message}
          onChange={setValue("message")}
          error={errorFor("message")}
        />
      </fieldset>

      {/* ------------------------------------------------------- Consent --- */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-xl font-bold text-ink">
          {uploadResume.fieldsets.consent.legend}
        </legend>
        <p className="text-base text-ink-muted">
          {uploadResume.fieldsets.consent.hint}
        </p>

        <CheckboxField
          field={consentFields.storeAndContact}
          checked={consents.storeAndContact}
          onChange={(checked) =>
            setConsents((current) => ({ ...current, storeAndContact: checked }))
          }
          error={errorFor("storeAndContact")}
        />

        {/* Separate, unchecked, and never required. */}
        <CheckboxField
          field={consentFields.futureRoles}
          checked={consents.futureRoles}
          onChange={(checked) =>
            setConsents((current) => ({ ...current, futureRoles: checked }))
          }
          error={errorFor("futureRoles")}
        />
      </fieldset>

      {/*
        Honeypot. Off-screen via the .honeypot class in globals.css, hidden
        from assistive tech and removed from the tab order, so the only way it
        gets a value is a script filling every input it finds.
      */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor={uploadResume.spam.honeypotId}>
          {uploadResume.spam.honeypotLabel}
        </label>
        <input
          id={uploadResume.spam.honeypotId}
          name={uploadResume.spam.honeypotId}
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
            ? uploadResume.submit.busyLabel
            : uploadResume.submit.label}
        </Button>
        <p className="mt-4 text-sm text-ink-muted">{uploadResume.privacyNote}</p>
      </div>
    </form>
  );
}
