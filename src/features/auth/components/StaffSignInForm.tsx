"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormErrorSummary, type SummaryError } from "@/components/ui/FormErrorSummary";
import { staffForm, staffSignIn } from "@/content/staff";
import { staffSignInAction, type StepState } from "../actions";

/**
 * Staff sign-in, the password half.
 *
 * The account screens' rules hold here too (CLAUDE.md, "Security rules"):
 * no client-side session state of any kind, nothing logged, one generic
 * failure message, `autoComplete` set for password managers, and no
 * honeypot or minimum-time check - the attempt limit is in the database.
 *
 * The form is submitted by calling the action from onSubmit rather than
 * through `action=`: React resets a form after an `action=` submission,
 * which would wipe the typed address under a failure message.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldKey = "email" | "password";

const { fields } = staffSignIn;

function validate(email: string, password: string): (SummaryError & { key: FieldKey })[] {
  const errors: (SummaryError & { key: FieldKey })[] = [];
  if (email.trim() === "") {
    errors.push({ key: "email", anchor: fields.email.id, message: fields.email.errorRequired });
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.push({ key: "email", anchor: fields.email.id, message: fields.email.errorFormat });
  }
  if (password === "") {
    errors.push({ key: "password", anchor: fields.password.id, message: fields.password.errorRequired });
  }
  return errors;
}

export function StaffSignInForm() {
  const [state, signIn, pending] = useActionState<StepState, FormData>(staffSignInAction, { failures: 0 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<(SummaryError & { key: FieldKey })[]>([]);
  const [invalidSubmits, setInvalidSubmits] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (invalidSubmits > 0) summaryRef.current?.focus();
  }, [invalidSubmits]);

  useEffect(() => {
    if (state.failures > 0) outcomeRef.current?.focus();
  }, [state.failures]);

  const errorFor = (key: FieldKey) => errors.find((error) => error.key === key)?.message;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(email, password);
    setErrors(found);
    if (found.length > 0) {
      setInvalidSubmits((count) => count + 1);
      return;
    }
    const formData = new FormData(event.currentTarget);
    // Sent, then cleared: never left behind a failure message.
    setPassword("");
    startTransition(() => signIn(formData));
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FormErrorSummary
        ref={summaryRef}
        errors={errors}
        title={staffForm.errorSummary.title}
        intro={staffForm.errorSummary.intro}
      />

      {state.failures > 0 && errors.length === 0 ? (
        <p
          ref={outcomeRef}
          tabIndex={-1}
          role="status"
          className="rounded-lg border border-brand bg-brand-soft p-5 text-base text-ink"
        >
          {staffSignIn.failed}
        </p>
      ) : null}

      <p className="text-base text-ink-muted">{staffForm.requiredLegend}</p>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">{staffSignIn.fieldsetLegend}</legend>
        <TextField
          field={fields.email}
          type="email"
          inputMode="email"
          value={email}
          onChange={setEmail}
          error={errorFor("email")}
        />
        <TextField
          field={fields.password}
          type="password"
          value={password}
          onChange={setPassword}
          error={errorFor("password")}
        />
      </fieldset>

      <div className="border-t border-border pt-8">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? staffSignIn.submit.busyLabel : staffSignIn.submit.label}
        </Button>
        <p className="mt-6 text-base text-ink-muted">{staffSignIn.help}</p>
      </div>
    </form>
  );
}
