/**
 * The server-only public surface of this feature: for the inbox, which runs
 * the resume check when staff open a row whose check never ran.
 */

export { checkResumeUpload } from "./queries.server";
