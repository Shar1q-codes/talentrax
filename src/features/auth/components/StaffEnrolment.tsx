"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { staffSetUp } from "@/content/staff";
import {
  staffConfirmEnrolmentAction,
  staffStartEnrolmentAction,
  type EnrolmentState,
} from "../actions";
import { StaffCodeForm } from "./StaffCodeForm";

/**
 * First sign-in: setting up the authenticator.
 *
 * Nothing is enrolled by loading the page. "Start setup" asks the server for
 * a new factor; the page shows its QR code and its key; the first code from
 * the app confirms it. Leaving halfway leaves an unverified factor, which the
 * next start removes.
 *
 * The QR code is drawn here from module coordinates (../totp-qr.ts): no
 * markup from Auth reaches the page, and there is no <img> (rule 7). The key
 * is always shown as text too, for anyone who cannot scan.
 */
export function StaffEnrolment() {
  const [state, start, starting] = useActionState<EnrolmentState>(staffStartEnrolmentAction, {
    enrolment: null,
    startFailed: false,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const failedRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.enrolment) headingRef.current?.focus();
    else if (state.startFailed) failedRef.current?.focus();
  }, [state]);

  const { enrolment } = state;

  if (!enrolment) {
    return (
      <div className="flex flex-col gap-6">
        {state.startFailed ? (
          <p
            ref={failedRef}
            tabIndex={-1}
            role="status"
            className="rounded-lg border border-brand bg-brand-soft p-5 text-base text-ink"
          >
            {staffSetUp.startFailed}
          </p>
        ) : null}
        <p className="text-base text-ink-muted">{staffSetUp.start.body}</p>
        <div>
          <Button size="lg" disabled={starting} onClick={() => startTransition(() => start())}>
            {starting ? staffSetUp.start.busyLabel : staffSetUp.start.label}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="set-up-scan" className="flex flex-col gap-4">
        <h2 id="set-up-scan" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-ink">
          {staffSetUp.scan.heading}
        </h2>
        {enrolment.qr ? (
          <>
            <p className="text-base text-ink-muted">{staffSetUp.scan.body}</p>
            <div className="w-56 max-w-full bg-surface p-2 text-ink">
              <svg
                viewBox={`0 0 ${enrolment.qr.size} ${enrolment.qr.size}`}
                role="img"
                aria-label={staffSetUp.scan.qrLabel}
                className="block h-auto w-full"
                shapeRendering="crispEdges"
              >
                <path d={enrolment.qr.path} fill="currentColor" />
              </svg>
            </div>
          </>
        ) : null}
        <p className="text-base text-ink-muted">{staffSetUp.scan.secretIntro}</p>
        <p className="break-all font-mono text-lg text-ink" data-totp-secret>
          {enrolment.secret}
        </p>
      </section>

      <section aria-labelledby="set-up-confirm" className="flex flex-col gap-4">
        <h2 id="set-up-confirm" className="text-xl font-bold text-ink">
          {staffSetUp.confirm.heading}
        </h2>
        <StaffCodeForm
          action={staffConfirmEnrolmentAction}
          field={staffSetUp.field}
          legend={staffSetUp.confirm.fieldsetLegend}
          submit={staffSetUp.submit}
          failed={staffSetUp.failed}
          hidden={{ "factor-id": enrolment.factorId }}
        />
      </section>
    </div>
  );
}
