"use client";

import { staffVerify } from "@/content/staff";
import { staffVerifyAction } from "../actions";
import { StaffCodeForm } from "./StaffCodeForm";

/** The second step of a staff sign-in: the code from the enrolled app. */
export function StaffVerifyForm() {
  return (
    <StaffCodeForm
      action={staffVerifyAction}
      field={staffVerify.field}
      legend={staffVerify.fieldsetLegend}
      submit={staffVerify.submit}
      failed={staffVerify.failed}
    />
  );
}
