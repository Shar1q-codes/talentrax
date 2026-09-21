"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import {
  FormErrorSummary,
  type SummaryError,
} from "@/components/ui/FormErrorSummary";
import { authForm, forgotPassword, notWiredNotice } from "@/content/auth";
import { requestPasswordReset, type AuthStatus } from "@/lib/auth";

/**
 * Request a password reset.
 *
 * THE CONFIRMATION IS THE SECURITY CONTROL. "If that email has an account, we
 * have sent it a reset link" is shown for every address, whether or not one
 * exists. A reset form is the easiest account-enumeration oracle on any site,
 * because it is the one page that is supposed to accept an email address from
 * a stranger. Do not make it "clearer".
 *
 * The same applies to timing when this is wired: the endpoint must take the
 * same time for a known and an unknown address, or the message is decoration
 * over a side channel.
 *
 * Nothing is logged and nothing is stored client-side. See lib/auth.ts.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Outcome copy. Identical for every address, by design. */
const OUTCOME_MESSAGE: Record<AuthStatus, string> = {
  accepted: forgotPassword.acceptedMessage,
  unavailable: notWiredNotice,
  failed: forgotPassword.failedMessage,
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<SummaryError[]>([]);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const field = forgotPassword.fields.email;
    const found: SummaryError[] = [];

    // Shape only. An address that is well-formed but unknown must reach the
    // endpoint and get the same answer as a known one.
    if (email.trim() === "") {
      if (field.errorRequired) {
        found.push({ anchor: field.id, message: field.errorRequired });
      }
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      if (field.errorFormat) {
        found.push({ anchor: field.id, message: field.errorFormat });
      }
    }

    if (found.length > 0) {
      setErrors(found);
      setStatus(null);
      setFailedAttempts((count) => count + 1);
      return;
    }
    setErrors([]);
    setBusy(true);

    const outcome = await requestPasswordReset({ email: email.trim() });

    setBusy(false);
    setStatus(outcome.status);
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
          {forgotPassword.fieldsetLegend}
        </legend>

        <TextField
          field={forgotPassword.fields.email}
          type="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          error={errors[0]?.message}
        />
      </fieldset>

      <div className="border-t border-border pt-8">
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy
            ? forgotPassword.submit.busyLabel
            : forgotPassword.submit.label}
        </Button>

        <p className="mt-6 text-base text-ink-muted">
          {forgotPassword.backIntro}{" "}
          <Link
            href={forgotPassword.backHref}
            className="link-inline"
          >
            {forgotPassword.backLabel}
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
