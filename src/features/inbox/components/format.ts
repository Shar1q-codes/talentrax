import { engagementModels, specialtyAreas } from "@/content/taxonomy";
import { usStates } from "@/content/request-talent";

/**
 * Display helpers for the inbox, shared by the list and the detail page.
 * Every name comes from the content layer; slugs never reach the page.
 */

const received = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** In UTC, and says so: the server has no idea where the reader is. */
export function formatReceived(iso: string): string {
  return `${received.format(new Date(iso))} UTC`;
}

export function deskName(desk: unknown): string | null {
  return specialtyAreas.find((area) => area.id === desk)?.name ?? null;
}

export function specialtyName(desk: unknown, specialty: unknown): string | null {
  return specialtyAreas.find((area) => area.id === desk)?.subSpecialties.find((sub) => sub.id === specialty)?.name ?? null;
}

export function engagementName(id: unknown): string {
  return engagementModels.find((model) => model.id === id)?.name ?? String(id);
}

export function stateName(code: unknown): string {
  return usStates.find((state) => state.value === code)?.label ?? String(code);
}
