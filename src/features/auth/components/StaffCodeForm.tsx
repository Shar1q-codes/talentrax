"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { FormErrorSummary, type SummaryError } from "@/components/ui/FormErrorSummary";
import type { FieldConfig } from "@/content/request-talent";
import { staffForm } from "@/content/staff";
import type { StepState } from "../actions";

/**
 * A six-digit code from the authenticator: the second step of every staff
 * sign-in, and the last step of setting one up. Private to this feature;
 * StaffVerifyForm and StaffEnrolment give it its action and its words.
 *
 * The code field is cleared once sent: a code is good for 30 seconds, so the
 * one just typed is no use for the next try.
 */

const SIX_DIGITS = /^\d{6}$/;

type CodeField = FieldConfig & { errorRequired: string; errorFormat: string };

export function StaffCodeForm({
  action,
  field,
  legend,
  submit,
  failed,
  hidden = {},
}: {
  action: (state: StepState, formData: FormData) => Promise<StepState>;
  field: CodeField;
  legend: string;
  submit: { label: string; busyLabel: string };
  failed: string;
  /** Extra fields the action needs, such as the factor being set up. */
  hidden?: Record<string, string>;
}) {
  const [state, send, pending] = useActionState(action, { failures: 0 });
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<SummaryError[]>([]);
  const [invalidSubmits, setInvalidSubmits] = useState(0);

  const summaryRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (invalidSubmits > 0) summaryRef.current?.focus();
  }, [invalidSubmits]);

  useEffect(() => {
    if (state.failures > 0) outcomeRef.current?.focus();
  }, [state.failures]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = code.trim();
    const found: SummaryError[] =
      typed === ""
        ? [{ anchor: field.id, message: field.errorRequired }]
        : SIX_DIGITS.test(typed)
          ? []
          : [{ anchor: field.id, message: field.errorFormat }];
    setErrors(found);
    if (found.length > 0) {
      setInvalidSubmits((count) => count + 1);
      return;
    }
    const formData = new FormData(event.currentTarget);
    setCode("");
    startTransition(() => send(formData));
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
          {failed}
        </p>
      ) : null}

      <p className="text-base text-ink-muted">{staffForm.requiredLegend}</p>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-xl font-bold text-ink">{legend}</legend>
        <TextField field={field} inputMode="numeric" value={code} onChange={setCode} error={errors[0]?.message} />
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </fieldset>

      <div className="border-t border-border pt-8">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? submit.busyLabel : submit.label}
        </Button>
      </div>
    </form>
  );
}
