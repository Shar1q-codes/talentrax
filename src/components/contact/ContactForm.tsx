"use client";

import { useEffect, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import {
  RadioGroupField,
  TextField,
  TextareaField,
} from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  contactFields,
  contactForm,
  enquiryTypeOptions,
} from "@/content/contact";
import { submitContact, type ContactPayload } from "@/lib/contact";

/**
 * The general contact form.
 *
 * Same accessibility contract as the requisition and upload forms: a real
 * <form noValidate>, a real <label> on every control, a fieldset with a
 * legend, an error summary with role="alert" that takes focus, per-field
 * aria-invalid and aria-describedby, and 44px minimum targets. See
 * components/ui/Field.tsx.
 *
 * Spam handling is a honeypot plus a minimum time on page, and both run only
 * AFTER validation passes, so a fast human filling the form correctly is
 * never silently dropped.
 *
 * submitContact() in lib/contact.ts is the single seam where the API gets
 * wired in later.
 */

type FieldKey = keyof typeof contactFields;

type FieldError = {
  key: FieldKey;
  /** The element the summary link should send focus to. */
  anchor: string;
  message: string;
};

type Values = Record<FieldKey, string>;

const initialValues: Values = {
  fullName: "",
  email: "",
  phone: "",
  enquiryType: "",
  subject: "",
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PHONE_DIGITS = 10;

/**
 * Validates in DOM order, so the error summary reads in the same order as
 * the form itself.
 */
function validate(values: Values): FieldError[] {
  const errors: FieldError[] = [];
  const add = (key: FieldKey, anchor: string, message: string | undefined) => {
    if (message) errors.push({ key, anchor, message });
  };

  if (values.fullName.trim() === "") {
    add("fullName", contactFields.fullName.id, contactFields.fullName.errorRequired);
  }

  if (values.email.trim() === "") {
    add("email", contactFields.email.id, contactFields.email.errorRequired);
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    add("email", contactFields.email.id, contactFields.email.errorFormat);
  }

  // Optional, but a phone number that cannot be dialled is worse than none.
  if (
    values.phone.trim() !== "" &&
    (values.phone.match(/\d/g) ?? []).length < MIN_PHONE_DIGITS
  ) {
    add("phone", contactFields.phone.id, contactFields.phone.errorFormat);
  }

  if (values.enquiryType === "") {
    // A fieldset cannot take focus, so the summary points at the first radio.
    add(
      "enquiryType",
      `${contactFields.enquiryType.id}-${enquiryTypeOptions[0].value}`,
      contactFields.enquiryType.errorRequired,
    );
  }

  if (values.subject.trim() === "") {
    add("subject", contactFields.subject.id, contactFields.subject.errorRequired);
  }

  if (values.message.trim() === "") {
    add("message", contactFields.message.id, contactFields.message.errorRequired);
  }

  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [honeypot, setHoneypot] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
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

  const setValue = (key: FieldKey) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const errorFor = (key: FieldKey) =>
    errors.find((error) => error.key === key)?.message;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values);
    if (found.length > 0) {
      setErrors(found);
      setFailedAttempts((count) => count + 1);
      return;
    }
    setErrors([]);

    // Both checks run only on an otherwise valid submission, and both fail
    // closed into the success state: a bot gets no signal it was caught.
    const secondsOnPage = openedAt.current
      ? (Date.now() - openedAt.current) / 1000
      : 0;
    const looksAutomated =
      honeypot.trim() !== "" || secondsOnPage < contactForm.spam.minSubmitSeconds;

    if (looksAutomated) {
      setStatus("sent");
      return;
    }

    const payload: ContactPayload = {
      submittedAt: new Date().toISOString(),
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      enquiryType: values.enquiryType,
      subject: values.subject.trim(),
      message: values.message.trim(),
    };

    setStatus("sending");
    const result = await submitContact(payload);
    setStatus(result.ok ? "sent" : "idle");
  }

  function handleReset() {
    setValues(initialValues);
    setErrors([]);
    setHoneypot("");
    setFailedAttempts(0);
    setStatus("idle");
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
          {contactForm.success.title}
        </h2>
        <p className="mt-4 text-base text-ink-muted">
          {contactForm.success.body}
        </p>
        <p className="mt-4 text-sm text-ink-muted">{contactForm.success.note}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleReset}>{contactForm.success.resetLabel}</Button>
          <ButtonLink href="/" variant="secondary">
            {contactForm.success.backLabel}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      {errors.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-danger bg-danger-soft p-5"
        >
          <h3 className="flex items-start gap-2 text-lg font-bold text-danger">
            <Icon name="alert" className="mt-1 h-5 w-5 shrink-0" />
            {contactForm.errorSummary.title}
          </h3>
          <p className="mt-2 text-base text-ink">
            {contactForm.errorSummary.intro}
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

      <p className="text-base text-ink-muted">{contactForm.required.legend}</p>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {contactForm.fieldset.legend}
        </legend>
        <p className="text-base text-ink-muted">{contactForm.fieldset.hint}</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            field={contactFields.fullName}
            value={values.fullName}
            onChange={setValue("fullName")}
            error={errorFor("fullName")}
          />
          <TextField
            field={contactFields.email}
            type="email"
            inputMode="email"
            value={values.email}
            onChange={setValue("email")}
            error={errorFor("email")}
          />
          <TextField
            field={contactFields.phone}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={setValue("phone")}
            error={errorFor("phone")}
          />
        </div>

        <RadioGroupField
          field={contactFields.enquiryType}
          value={values.enquiryType}
          onChange={setValue("enquiryType")}
          error={errorFor("enquiryType")}
          options={enquiryTypeOptions}
        />

        <TextField
          field={contactFields.subject}
          value={values.subject}
          onChange={setValue("subject")}
          error={errorFor("subject")}
        />

        <TextareaField
          field={contactFields.message}
          rows={6}
          value={values.message}
          onChange={setValue("message")}
          error={errorFor("message")}
        />
      </fieldset>

      {/*
        Honeypot. Off-screen via the .honeypot class in globals.css, hidden
        from assistive tech and removed from the tab order, so the only way it
        gets a value is a script filling every input it finds.
      */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor={contactForm.spam.honeypotId}>
          {contactForm.spam.honeypotLabel}
        </label>
        <input
          id={contactForm.spam.honeypotId}
          name={contactForm.spam.honeypotId}
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
            ? contactForm.submit.busyLabel
            : contactForm.submit.label}
        </Button>
        <p className="mt-4 text-sm text-ink-muted">{contactForm.privacyNote}</p>
      </div>
    </form>
  );
}
