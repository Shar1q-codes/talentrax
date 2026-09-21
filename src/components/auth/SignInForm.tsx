"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import {
  FormErrorSummary,
  type SummaryError,
} from "@/components/ui/FormErrorSummary";
import { authForm, login, notWiredNotice } from "@/content/auth";
import { signIn, type AuthStatus } from "@/lib/auth";

/**
 * Sign in.
 *
 * NO CLIENT-SIDE SESSION STATE. This component writes no localStorage, no
 * sessionStorage, no cookie and no "signed in" flag, and must not start to.
 * A session is an HttpOnly cookie the server sets; a flag in the client is
 * something an attacker types into a console.
 *
 * NOTHING IS LOGGED. Not the password, not the payload, not the email. See
 * the header of lib/auth.ts.
 *
 * NO HONEYPOT and no minimum-time check, unlike the other forms on this site.
 * Both are wrong here: a password manager fills a sign-in form faster than a
 * human can, so a time check punishes exactly the people doing it properly,
 * and credential stuffing is defeated by server-side rate limiting and
 * lockout, which a hidden input cannot do.
 *
 * NO SOCIAL SIGN-IN and no "remember me": the first is a backend integration
 * nobody has chosen, the second is a session-lifetime decision the backend
 * has not made.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldKey = "email" | "password";

type Values = Record<FieldKey, string>;

const initialValues: Values = { email: "", password: "" };

/**
 * Validates shape only. It checks that a password was typed, never how long
 * it is or what is in it: a sign-in form that comments on the password it was
 * given is telling an attacker something about the password it expected.
 */
function validate(values: Values): (SummaryError & { key: FieldKey })[] {
  const errors: (SummaryError & { key: FieldKey })[] = [];
  const add = (key: FieldKey, anchor: string, message: string | undefined) => {
    if (message) errors.push({ key, anchor, message });
  };

  if (values.email.trim() === "") {
    add("email", login.fields.email.id, login.fields.email.errorRequired);
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    add("email", login.fields.email.id, login.fields.email.errorFormat);
  }

  if (values.password === "") {
    add(
      "password",
      login.fields.password.id,
      login.fields.password.errorRequired,
    );
  }

  return errors;
}

/** Outcome copy. Never varies by whether the account exists. */
const OUTCOME_MESSAGE: Record<AuthStatus, string> = {
  accepted: login.acceptedMessage,
  unavailable: notWiredNotice,
  failed: login.failedMessage,
};

export function SignInForm() {
  const [values, setValues] = useState<Values>(initialValues);
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

  const setValue = (key: FieldKey) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const errorFor = (key: FieldKey) =>
    errors.find((error) => error.key === key)?.message;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(values);
    if (found.length > 0) {
      setErrors(found);
      setStatus(null);
      setFailedAttempts((count) => count + 1);
      return;
    }
    setErrors([]);
    setBusy(true);

    const outcome = await signIn({
      email: values.email.trim(),
      password: values.password,
    });

    // TODO(api): an accepted sign-in redirects rather than rendering - the
    // server will have set the session cookie by this point and there is
    // nothing for this component to remember.
    setBusy(false);
    setStatus(outcome.status);
    // Clear the password from component state either way. It is not a
    // meaningful protection on its own, but leaving it in memory behind a
    // rendered error message serves nothing.
    setValues((current) => ({ ...current, password: "" }));
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
          {login.fieldsetLegend}
        </legend>

        <TextField
          field={login.fields.email}
          type="email"
          inputMode="email"
          value={values.email}
          onChange={setValue("email")}
          error={errorFor("email")}
        />

        <TextField
          field={login.fields.password}
          type="password"
          value={values.password}
          onChange={setValue("password")}
          error={errorFor("password")}
        />

        <p className="text-base">
          <Link
            href={login.forgotHref}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {login.forgotLabel}
          </Link>
        </p>
      </fieldset>

      <div className="border-t border-border pt-8">
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy ? login.submit.busyLabel : login.submit.label}
        </Button>

        <p className="mt-6 text-base text-ink-muted">
          {login.registerIntro}{" "}
          <Link
            href={login.registerHref}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {login.registerLabel}
          </Link>
          .
        </p>

        <p className="mt-2 text-base text-ink-muted">
          {login.uploadIntro}{" "}
          <Link
            href={login.uploadHref}
            className="font-semibold text-brand underline decoration-border-control underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand"
          >
            {login.uploadLabel}
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
