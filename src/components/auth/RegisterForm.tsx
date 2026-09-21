"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/Field";
import {
  FormErrorSummary,
  type SummaryError,
} from "@/components/ui/FormErrorSummary";
import {
  authForm,
  MIN_PASSWORD_LENGTH,
  notWiredNotice,
  register,
} from "@/content/auth";
import { registerAccount, type AuthStatus } from "@/lib/auth";

/**
 * Create a candidate account.
 *
 * CANDIDATE ACCOUNTS ONLY. There is no account-type selector, by decision:
 * employer accounts are created by the Talentrax team. A selector here would
 * be a self-service route to an employer account, which is a privilege
 * question dressed up as a form field.
 *
 * NO CLIENT-SIDE SESSION STATE, nothing logged, no strength meter. See the
 * headers of lib/auth.ts and content/auth.ts.
 *
 * THE CONFIRMATION MESSAGE DOES NOT SAY WHETHER THE ACCOUNT WAS CREATED, and
 * must not be "improved" into saying so. "That email is already registered"
 * hands an attacker a way to test addresses one at a time against a candidate
 * database. The backend emails the existing account instead.
 *
 * The password length check here is a courtesy to the person typing. It is
 * not a security control - the server has to enforce its own minimum, and
 * anyone who wants to bypass this one just does not use the form.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type TextKey = "fullName" | "email" | "password" | "confirmPassword";
type FieldKey = TextKey | "accountAndContact";

type Values = Record<TextKey, string>;

const initialValues: Values = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function validate(
  values: Values,
  consents: { accountAndContact: boolean; futureRoles: boolean },
): (SummaryError & { key: FieldKey })[] {
  const errors: (SummaryError & { key: FieldKey })[] = [];
  const add = (key: FieldKey, anchor: string, message: string | undefined) => {
    if (message) errors.push({ key, anchor, message });
  };

  const fields = register.fields;

  if (values.fullName.trim() === "") {
    add("fullName", fields.fullName.id, fields.fullName.errorRequired);
  }

  if (values.email.trim() === "") {
    add("email", fields.email.id, fields.email.errorRequired);
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    add("email", fields.email.id, fields.email.errorFormat);
  }

  if (values.password === "") {
    add("password", fields.password.id, fields.password.errorRequired);
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    add("password", fields.password.id, fields.password.errorFormat);
  }

  if (values.confirmPassword === "") {
    add(
      "confirmPassword",
      fields.confirmPassword.id,
      fields.confirmPassword.errorRequired,
    );
  } else if (values.confirmPassword !== values.password) {
    add(
      "confirmPassword",
      fields.confirmPassword.id,
      fields.confirmPassword.errorFormat,
    );
  }

  // The optional consent is never validated. That is the point of it.
  if (!consents.accountAndContact) {
    add(
      "accountAndContact",
      register.consentFields.accountAndContact.id,
      register.consentFields.accountAndContact.errorRequired,
    );
  }

  return errors;
}

/** Outcome copy. Never varies by whether the address already has an account. */
const OUTCOME_MESSAGE: Record<AuthStatus, string> = {
  accepted: register.acceptedMessage,
  unavailable: notWiredNotice,
  failed: register.failedMessage,
};

export function RegisterForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [consents, setConsents] = useState({
    accountAndContact: false,
    futureRoles: false,
  });
  const [errors, setErrors] = useState<(SummaryError & { key: FieldKey })[]>([]);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (failedAttempts > 0) summaryRef.current?.focus();
  }, [failedAttempts]);

  useEffect(() => {
    if (status) outcomeRef.current?.focus();
  }, [status]);

  const setValue = (key: TextKey) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const errorFor = (key: FieldKey) =>
    errors.find((error) => error.key === key)?.message;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values, consents);
    if (found.length > 0) {
      setErrors(found);
      setStatus(null);
      setFailedAttempts((count) => count + 1);
      return;
    }
    setErrors([]);
    setBusy(true);

    const outcome = await registerAccount({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password,
      consent: { ...consents },
    });

    setBusy(false);
    setStatus(outcome.status);
    setValues((current) => ({ ...current, password: "", confirmPassword: "" }));
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FormErrorSummary
        ref={summaryRef}
        errors={errors}
        title={authForm.errorSummary.title}
        intro={authForm.errorSummary.intro}
      />

      {status ? (
        <p
          ref={outcomeRef}
          tabIndex={-1}
          role="status"
          className="rounded-lg border border-brand bg-brand-soft p-5 text-base text-ink"
        >
          {OUTCOME_MESSAGE[status]}
        </p>
      ) : null}

      <p className="text-base text-ink-muted">{authForm.requiredLegend}</p>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">
          {register.fieldsetLegend}
        </legend>

        <TextField
          field={register.fields.fullName}
          value={values.fullName}
          onChange={setValue("fullName")}
          error={errorFor("fullName")}
        />

        <TextField
          field={register.fields.email}
          type="email"
          inputMode="email"
          value={values.email}
          onChange={setValue("email")}
          error={errorFor("email")}
        />

        <TextField
          field={register.fields.password}
          type="password"
          value={values.password}
          onChange={setValue("password")}
          error={errorFor("password")}
        />

        <TextField
          field={register.fields.confirmPassword}
          type="password"
          value={values.confirmPassword}
          onChange={setValue("confirmPassword")}
          error={errorFor("confirmPassword")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-xl font-bold text-ink">
          {register.consentLegend}
        </legend>
        <p className="text-base text-ink-muted">{register.consentHint}</p>

        <CheckboxField
          field={register.consentFields.accountAndContact}
          checked={consents.accountAndContact}
          onChange={(checked) =>
            setConsents((current) => ({
              ...current,
              accountAndContact: checked,
            }))
          }
          error={errorFor("accountAndContact")}
        />

        {/* Separate, unchecked, and never required. */}
        <CheckboxField
          field={register.consentFields.futureRoles}
          checked={consents.futureRoles}
          onChange={(checked) =>
            setConsents((current) => ({ ...current, futureRoles: checked }))
          }
        />
      </fieldset>

      <div className="border-t border-border pt-8">
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy ? register.submit.busyLabel : register.submit.label}
        </Button>

        <p className="mt-6 text-base text-ink-muted">
          {register.signInIntro}{" "}
          <Link
            href={register.signInHref}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {register.signInLabel}
          </Link>
          .
        </p>

        <p className="mt-2 text-base text-ink-muted">
          {register.privacyIntro}{" "}
          <Link
            href={register.privacyHref}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {register.privacyLabel}
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
