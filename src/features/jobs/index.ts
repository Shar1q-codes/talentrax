/**
 * The public surface of this feature. Code outside src/features/jobs/
 * imports from "@/features/jobs" and nothing deeper; anything not
 * exported here is private to the feature.
 */

export { EmptyBoard } from "./components/EmptyBoard";
export { JobBoard } from "./components/JobBoard";
export { formatLocation, formatPayRange, formatPostedDate } from "./format";
export { jobPostingJsonLd } from "./job-posting-schema";
export {
  getJobBySlug,
  getJobs,
  // The one source of expired slugs for the 410 wiring; see the
  // wire-expired-postings skill.
  getRecentlyExpiredSlugs,
  isExpired,
} from "./queries";
