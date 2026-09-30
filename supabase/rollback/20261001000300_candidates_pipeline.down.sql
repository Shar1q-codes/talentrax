-- Rolls back 20261001000300_candidates_pipeline.sql.
-- LOCAL DEVELOPMENT ONLY. See supabase/README.md.

drop table if exists
  public.placements,
  public.offers,
  public.interviews,
  public.submission_events,
  public.submissions,
  public.applications,
  public.candidate_embeddings,
  public.candidate_documents,
  public.candidate_engagement_types,
  public.resume_submissions,
  public.candidates;

drop function if exists
  private.derive_placement(),
  private.require_sent_submission(),
  private.submission_timeline(),
  private.submission_workflow(),
  private.stamp_consent(),
  private.guard_candidate_document(),
  private.current_candidate_id(),
  private.check_engagement_types_array();
