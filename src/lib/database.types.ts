
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "actor_id": string | null,"body": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"direction": string | null,"due_at": string | null,"id": string,"kind": string,"next_action": string | null,"occurred_at": string,"outcome": string | null,"subject_id": string,"subject_line": string | null,"subject_type": string,"updated_at": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"body"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"direction"?: string | null,"due_at"?: string | null,"id"?: string,"kind": string,"next_action"?: string | null,"occurred_at"?: string,"outcome"?: string | null,"subject_id": string,"subject_line"?: string | null,"subject_type": string,"updated_at"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"direction"?: string | null,"due_at"?: string | null,"id"?: string,"kind"?: string,"next_action"?: string | null,"occurred_at"?: string,"outcome"?: string | null,"subject_id"?: string,"subject_line"?: string | null,"subject_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "applied_at": string,"candidate_id": string,"consent_future_roles": boolean,"consent_recorded_at": string,"consent_store": boolean,"cover_note": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"job_id": string,"source": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "applied_at"?: string,"candidate_id": string,"consent_future_roles"?: boolean,"consent_recorded_at"?: string,"consent_store": boolean,"cover_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"job_id": string,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "applied_at"?: string,"candidate_id"?: string,"consent_future_roles"?: boolean,"consent_recorded_at"?: string,"consent_store"?: boolean,"cover_note"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"job_id"?: string,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "public_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"created_by": string | null,"id": string,"ip": unknown,"new_values": Json | null,"occurred_at": string,"old_values": Json | null,"record_id": string | null,"table_name": string,"updated_at": string,"user_agent": string | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ip"?: unknown,"new_values"?: Json | null,"occurred_at"?: string,"old_values"?: Json | null,"record_id"?: string | null,"table_name": string,"updated_at"?: string,"user_agent"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ip"?: unknown,"new_values"?: Json | null,"occurred_at"?: string,"old_values"?: Json | null,"record_id"?: string | null,"table_name"?: string,"updated_at"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"audit_settings": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"retention_days": number | null,"singleton": boolean,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"retention_days"?: number | null,"singleton"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"retention_days"?: number | null,"singleton"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_documents": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"is_original": boolean,"kind": string,"mime_type": string | null,"original_filename": string | null,"parent_document_id": string | null,"size_bytes": number | null,"storage_path": string,"updated_at": string,"uploaded_at": string,"uploaded_by": string | null,"version": number
                  }
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"is_original"?: boolean,"kind": string,"mime_type"?: string | null,"original_filename"?: string | null,"parent_document_id"?: string | null,"size_bytes"?: number | null,"storage_path": string,"updated_at"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"is_original"?: boolean,"kind"?: string,"mime_type"?: string | null,"original_filename"?: string | null,"parent_document_id"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"updated_at"?: string,"uploaded_at"?: string,"uploaded_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_documents_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_documents_parent_same_candidate"
      columns: ["parent_document_id","candidate_id"]
isOneToOne: false
      referencedRelation: "candidate_documents"
      referencedColumns: ["id","candidate_id"]
    },{
      foreignKeyName: "candidate_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_embeddings": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"embedding": string,"generated_at": string,"id": string,"model_name": string,"source_document_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"embedding": string,"generated_at"?: string,"id"?: string,"model_name": string,"source_document_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"embedding"?: string,"generated_at"?: string,"id"?: string,"model_name"?: string,"source_document_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_embeddings_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_embeddings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_embeddings_document_same_candidate"
      columns: ["source_document_id","candidate_id"]
isOneToOne: false
      referencedRelation: "candidate_documents"
      referencedColumns: ["id","candidate_id"]
    }
                  ]
                },"candidate_engagement_types": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"engagement_type": string,"id": string,"updated_at": string
                  }
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"engagement_type": string,"id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"engagement_type"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_engagement_types_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_engagement_types_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidate_engagement_types_engagement_type_fkey"
      columns: ["engagement_type"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    }
                  ]
                },"candidate_statuses": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"is_system": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_statuses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidates": {
                  Row: {
                    "city": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"desk": string | null,"email": string | null,"email_normalized": string | null,"erased_at": string | null,"expected_salary": number | null,"expected_salary_unit": string | null,"full_name": string | null,"id": string,"linkedin_url": string | null,"owner_id": string | null,"phone": string | null,"profile_id": string | null,"source": string,"specialty": string | null,"state": string | null,"status": string,"updated_at": string,"work_authorized": boolean | null
                  }
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string | null,"email"?: string | null,"email_normalized"?: never,"erased_at"?: string | null,"expected_salary"?: number | null,"expected_salary_unit"?: string | null,"full_name"?: string | null,"id"?: string,"linkedin_url"?: string | null,"owner_id"?: string | null,"phone"?: string | null,"profile_id"?: string | null,"source"?: string,"specialty"?: string | null,"state"?: string | null,"status"?: string,"updated_at"?: string,"work_authorized"?: boolean | null
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string | null,"email"?: string | null,"email_normalized"?: never,"erased_at"?: string | null,"expected_salary"?: number | null,"expected_salary_unit"?: string | null,"full_name"?: string | null,"id"?: string,"linkedin_url"?: string | null,"owner_id"?: string | null,"phone"?: string | null,"profile_id"?: string | null,"source"?: string,"specialty"?: string | null,"state"?: string | null,"status"?: string,"updated_at"?: string,"work_authorized"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidates_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "candidates_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidates_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidates_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "candidates_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "candidates_status_fkey"
      columns: ["status"]
isOneToOne: false
      referencedRelation: "candidate_statuses"
      referencedColumns: ["slug"]
    }
                  ]
                },"communication_consents": {
                  Row: {
                    "address": string | null,"candidate_id": string | null,"channel": string,"consent_given": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"employer_contact_id": string | null,"given_at": string | null,"id": string,"source": string,"source_detail": string | null,"updated_at": string,"withdrawn_at": string | null
                  }
                  Insert: {
                    "address"?: string | null,"candidate_id"?: string | null,"channel": string,"consent_given": boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"employer_contact_id"?: string | null,"given_at"?: string | null,"id"?: string,"source": string,"source_detail"?: string | null,"updated_at"?: string,"withdrawn_at"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"candidate_id"?: string | null,"channel"?: string,"consent_given"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"employer_contact_id"?: string | null,"given_at"?: string | null,"id"?: string,"source"?: string,"source_detail"?: string | null,"updated_at"?: string,"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "communication_consents_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_consents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "communication_consents_employer_contact_id_fkey"
      columns: ["employer_contact_id"]
isOneToOne: false
      referencedRelation: "employer_contacts"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"email": string,"email_normalized": string | null,"enquiry_type": string,"full_name": string,"held_at": string | null,"id": string,"message": string,"owner_id": string | null,"phone": string | null,"status": string,"subject": string,"submission_key": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"email": string,"email_normalized"?: never,"enquiry_type": string,"full_name": string,"held_at"?: string | null,"id"?: string,"message": string,"owner_id"?: string | null,"phone"?: string | null,"status"?: string,"subject": string,"submission_key"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"email"?: string,"email_normalized"?: never,"enquiry_type"?: string,"full_name"?: string,"held_at"?: string | null,"id"?: string,"message"?: string,"owner_id"?: string | null,"phone"?: string | null,"status"?: string,"subject"?: string,"submission_key"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_messages_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_messages_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"content": {
                  Row: {
                    "author_id": string | null,"body": NonNullable<Json>,"canonical_url": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"published_at": string | null,"reviewer_id": string | null,"seo_description": string | null,"seo_title": string | null,"slug": string,"status": string,"summary": string | null,"title": string,"type": string,"updated_at": string
                  }
                  Insert: {
                    "author_id"?: string | null,"body"?: NonNullable<Json>,"canonical_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"published_at"?: string | null,"reviewer_id"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"status"?: string,"summary"?: string | null,"title": string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: NonNullable<Json>,"canonical_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"published_at"?: string | null,"reviewer_id"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"status"?: string,"summary"?: string | null,"title"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"deletion_requests": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"attempts": number,"cancelled_at": string | null,"cancelled_by": string | null,"candidate_id": string,"created_at": string,"created_by": string | null,"deferral_basis": (string)[],"deferred_until": string | null,"erasure_summary": NonNullable<Json>,"execute_after": string | null,"executed_at": string | null,"id": string,"last_error_at": string | null,"last_error_state": string | null,"manner": string,"partially_executed_at": string | null,"refusal_basis": string | null,"refused_at": string | null,"refused_by": string | null,"requested_at": string,"requested_by": string | null,"status": string,"updated_at": string,"verification_method": string | null
                  }
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"attempts"?: number,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deferral_basis"?: (string)[],"deferred_until"?: string | null,"erasure_summary"?: NonNullable<Json>,"execute_after"?: string | null,"executed_at"?: string | null,"id"?: string,"last_error_at"?: string | null,"last_error_state"?: string | null,"manner": string,"partially_executed_at"?: string | null,"refusal_basis"?: string | null,"refused_at"?: string | null,"refused_by"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"status"?: string,"updated_at"?: string,"verification_method"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"attempts"?: number,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deferral_basis"?: (string)[],"deferred_until"?: string | null,"erasure_summary"?: NonNullable<Json>,"execute_after"?: string | null,"executed_at"?: string | null,"id"?: string,"last_error_at"?: string | null,"last_error_state"?: string | null,"manner"?: string,"partially_executed_at"?: string | null,"refusal_basis"?: string | null,"refused_at"?: string | null,"refused_by"?: string | null,"requested_at"?: string,"requested_by"?: string | null,"status"?: string,"updated_at"?: string,"verification_method"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deletion_requests_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_refused_by_fkey"
      columns: ["refused_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"desks": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "desks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"email_templates": {
                  Row: {
                    "body": string,"channel": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"is_active": boolean,"merge_fields": (string)[],"name": string,"slug": string,"subject": string | null,"updated_at": string
                  }
                  Insert: {
                    "body": string,"channel"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"is_active"?: boolean,"merge_fields"?: (string)[],"name": string,"slug": string,"subject"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"channel"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"is_active"?: boolean,"merge_fields"?: (string)[],"name"?: string,"slug"?: string,"subject"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_templates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"employer_contacts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"email": string | null,"email_normalized": string | null,"employer_id": string,"full_name": string,"id": string,"is_primary": boolean,"phone": string | null,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"email"?: string | null,"email_normalized"?: never,"employer_id": string,"full_name": string,"id"?: string,"is_primary"?: boolean,"phone"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"email"?: string | null,"email_normalized"?: never,"employer_id"?: string,"full_name"?: string,"id"?: string,"is_primary"?: boolean,"phone"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employer_contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employer_contacts_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    }
                  ]
                },"employers": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"city": string | null,"company_name": string,"company_name_normalized": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"industry": string | null,"notes": string | null,"owner_id": string | null,"postal_code": string | null,"size_band": string | null,"state": string | null,"status": string,"updated_at": string,"website": string | null
                  }
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"city"?: string | null,"company_name": string,"company_name_normalized"?: never,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"industry"?: string | null,"notes"?: string | null,"owner_id"?: string | null,"postal_code"?: string | null,"size_band"?: string | null,"state"?: string | null,"status"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"city"?: string | null,"company_name"?: string,"company_name_normalized"?: never,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"industry"?: string | null,"notes"?: string | null,"owner_id"?: string | null,"postal_code"?: string | null,"size_band"?: string | null,"state"?: string | null,"status"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "employers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employers_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employers_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    }
                  ]
                },"engagement_types": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "engagement_types_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"intake_limits": {
                  Row: {
                    "action": string,"created_at": string,"created_by": string | null,"form": string,"id": string,"max_submissions": number,"scope": string,"updated_at": string,"window_length": string
                  }
                  Insert: {
                    "action": string,"created_at"?: string,"created_by"?: string | null,"form": string,"id"?: string,"max_submissions": number,"scope": string,"updated_at"?: string,"window_length": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"created_by"?: string | null,"form"?: string,"id"?: string,"max_submissions"?: number,"scope"?: string,"updated_at"?: string,"window_length"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "intake_limits_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"interviews": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"duration_minutes": number | null,"feedback": string | null,"id": string,"interviewer_names": (string)[],"location_or_link": string | null,"mode": string,"outcome": string | null,"reminder_sent_at": string | null,"round": number,"scheduled_at": string | null,"status": string,"submission_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"duration_minutes"?: number | null,"feedback"?: string | null,"id"?: string,"interviewer_names"?: (string)[],"location_or_link"?: string | null,"mode": string,"outcome"?: string | null,"reminder_sent_at"?: string | null,"round"?: number,"scheduled_at"?: string | null,"status"?: string,"submission_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"duration_minutes"?: number | null,"feedback"?: string | null,"id"?: string,"interviewer_names"?: (string)[],"location_or_link"?: string | null,"mode"?: string,"outcome"?: string | null,"reminder_sent_at"?: string | null,"round"?: number,"scheduled_at"?: string | null,"status"?: string,"submission_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "interviews_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interviews_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submission_documents"
      referencedColumns: ["submission_id"]
    },{
      foreignKeyName: "interviews_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interviews_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"job_statuses": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"is_system": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_statuses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "canonical_url": string | null,"city": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"desk": string,"engagement_type": string,"expires_at": string | null,"id": string,"is_test": boolean,"public_description": string | null,"published_at": string | null,"requisition_id": string,"salary_currency": string,"salary_max": number,"salary_min": number,"salary_unit": string,"seo_description": string | null,"seo_title": string | null,"slug": string,"specialty": string | null,"state": string | null,"status": string,"title": string,"updated_at": string,"work_mode": string
                  }
                  Insert: {
                    "canonical_url"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk": string,"engagement_type": string,"expires_at"?: string | null,"id"?: string,"is_test"?: boolean,"public_description"?: string | null,"published_at"?: string | null,"requisition_id": string,"salary_currency"?: string,"salary_max": number,"salary_min": number,"salary_unit": string,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"specialty"?: string | null,"state"?: string | null,"status"?: string,"title": string,"updated_at"?: string,"work_mode": string
                  }
                  Update: {
                    "canonical_url"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string,"engagement_type"?: string,"expires_at"?: string | null,"id"?: string,"is_test"?: boolean,"public_description"?: string | null,"published_at"?: string | null,"requisition_id"?: string,"salary_currency"?: string,"salary_max"?: number,"salary_min"?: number,"salary_unit"?: string,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"specialty"?: string | null,"state"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"work_mode"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "jobs_engagement_type_fkey"
      columns: ["engagement_type"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "jobs_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "employer_requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "jobs_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "jobs_status_fkey"
      columns: ["status"]
isOneToOne: false
      referencedRelation: "job_statuses"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "jobs_work_mode_fkey"
      columns: ["work_mode"]
isOneToOne: false
      referencedRelation: "work_modes"
      referencedColumns: ["slug"]
    }
                  ]
                },"lead_statuses": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"is_system": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_statuses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "city": string | null,"closed_reason": string | null,"company_name": string | null,"company_name_normalized": string | null,"contact_email": string | null,"contact_email_normalized": string | null,"contact_name": string | null,"contact_phone": string | null,"contact_title": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"desk": string | null,"employer_id": string | null,"engagement_type": string | null,"held_at": string | null,"id": string,"notes": string | null,"owner_id": string | null,"positions": number | null,"qualified_at": string | null,"requested_service": string | null,"role_title": string | null,"salary_currency": string,"salary_max": number | null,"salary_min": number | null,"salary_unit": string | null,"source": string,"source_url": string | null,"specialty": string | null,"state": string | null,"status": string,"submission_key": string | null,"submitted_details": string | null,"target_start": string | null,"updated_at": string,"urgency": string | null,"work_mode": string | null
                  }
                  Insert: {
                    "city"?: string | null,"closed_reason"?: string | null,"company_name"?: string | null,"company_name_normalized"?: never,"contact_email"?: string | null,"contact_email_normalized"?: never,"contact_name"?: string | null,"contact_phone"?: string | null,"contact_title"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string | null,"employer_id"?: string | null,"engagement_type"?: string | null,"held_at"?: string | null,"id"?: string,"notes"?: string | null,"owner_id"?: string | null,"positions"?: number | null,"qualified_at"?: string | null,"requested_service"?: string | null,"role_title"?: string | null,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"source": string,"source_url"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string,"submission_key"?: string | null,"submitted_details"?: string | null,"target_start"?: string | null,"updated_at"?: string,"urgency"?: string | null,"work_mode"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"closed_reason"?: string | null,"company_name"?: string | null,"company_name_normalized"?: never,"contact_email"?: string | null,"contact_email_normalized"?: never,"contact_name"?: string | null,"contact_phone"?: string | null,"contact_title"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string | null,"employer_id"?: string | null,"engagement_type"?: string | null,"held_at"?: string | null,"id"?: string,"notes"?: string | null,"owner_id"?: string | null,"positions"?: number | null,"qualified_at"?: string | null,"requested_service"?: string | null,"role_title"?: string | null,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"source"?: string,"source_url"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string,"submission_key"?: string | null,"submitted_details"?: string | null,"target_start"?: string | null,"updated_at"?: string,"urgency"?: string | null,"work_mode"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "leads_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_engagement_type_fkey"
      columns: ["engagement_type"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "leads_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_requested_service_fkey"
      columns: ["requested_service"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "leads_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "leads_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "leads_status_fkey"
      columns: ["status"]
isOneToOne: false
      referencedRelation: "lead_statuses"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "leads_work_mode_fkey"
      columns: ["work_mode"]
isOneToOne: false
      referencedRelation: "work_modes"
      referencedColumns: ["slug"]
    }
                  ]
                },"legal_holds": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"matter_reference": string | null,"placed_at": string,"placed_by": string,"reason": string,"released_at": string | null,"released_by": string | null,"updated_at": string
                  }
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"matter_reference"?: string | null,"placed_at"?: string,"placed_by": string,"reason": string,"released_at"?: string | null,"released_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"matter_reference"?: string | null,"placed_at"?: string,"placed_by"?: string,"reason"?: string,"released_at"?: string | null,"released_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "legal_holds_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "legal_holds_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "legal_holds_placed_by_fkey"
      columns: ["placed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "legal_holds_released_by_fkey"
      columns: ["released_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"message_log": {
                  Row: {
                    "body": string | null,"candidate_id": string | null,"channel": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"delivered_at": string | null,"delivery_status": string,"employer_contact_id": string | null,"error": string | null,"id": string,"merge_data": NonNullable<Json>,"provider": string | null,"provider_message_id": string | null,"sent_at": string | null,"sent_by": string | null,"subject": string | null,"template_id": string | null,"to_address": string,"updated_at": string
                  }
                  Insert: {
                    "body"?: string | null,"candidate_id"?: string | null,"channel": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"delivered_at"?: string | null,"delivery_status"?: string,"employer_contact_id"?: string | null,"error"?: string | null,"id"?: string,"merge_data"?: NonNullable<Json>,"provider"?: string | null,"provider_message_id"?: string | null,"sent_at"?: string | null,"sent_by"?: string | null,"subject"?: string | null,"template_id"?: string | null,"to_address": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"candidate_id"?: string | null,"channel"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"delivered_at"?: string | null,"delivery_status"?: string,"employer_contact_id"?: string | null,"error"?: string | null,"id"?: string,"merge_data"?: NonNullable<Json>,"provider"?: string | null,"provider_message_id"?: string | null,"sent_at"?: string | null,"sent_by"?: string | null,"subject"?: string | null,"template_id"?: string | null,"to_address"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_log_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_employer_contact_id_fkey"
      columns: ["employer_contact_id"]
isOneToOne: false
      referencedRelation: "employer_contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_sent_by_fkey"
      columns: ["sent_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "email_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "created_at": string,"created_by": string | null,"decline_reason": string | null,"deleted_at": string | null,"id": string,"offered_at": string,"responded_at": string | null,"salary": number | null,"salary_unit": string | null,"start_date": string | null,"status": string,"submission_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"decline_reason"?: string | null,"deleted_at"?: string | null,"id"?: string,"offered_at"?: string,"responded_at"?: string | null,"salary"?: number | null,"salary_unit"?: string | null,"start_date"?: string | null,"status"?: string,"submission_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"decline_reason"?: string | null,"deleted_at"?: string | null,"id"?: string,"offered_at"?: string,"responded_at"?: string | null,"salary"?: number | null,"salary_unit"?: string | null,"start_date"?: string | null,"status"?: string,"submission_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submission_documents"
      referencedColumns: ["submission_id"]
    },{
      foreignKeyName: "offers_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"placements": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"employer_id": string,"end_date": string | null,"fee_basis_notes": string | null,"guarantee_period_end": string | null,"id": string,"offer_id": string,"requisition_id": string,"start_date": string,"status": string,"submission_id": string,"updated_at": string
                  }
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"employer_id": string,"end_date"?: string | null,"fee_basis_notes"?: string | null,"guarantee_period_end"?: string | null,"id"?: string,"offer_id": string,"requisition_id": string,"start_date": string,"status"?: string,"submission_id": string,"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"employer_id"?: string,"end_date"?: string | null,"fee_basis_notes"?: string | null,"guarantee_period_end"?: string | null,"id"?: string,"offer_id"?: string,"requisition_id"?: string,"start_date"?: string,"status"?: string,"submission_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "placements_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: true
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "employer_requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submission_documents"
      referencedColumns: ["submission_id"]
    },{
      foreignKeyName: "placements_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "placements_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"email": string | null,"employer_id": string | null,"full_name": string | null,"id": string,"is_active": boolean,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"email"?: string | null,"employer_id"?: string | null,"full_name"?: string | null,"id": string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"email"?: string | null,"employer_id"?: string | null,"full_name"?: string | null,"id"?: string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    }
                  ]
                },"requisition_assignments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted_at": string | null,"id": string,"recruiter_id": string,"requisition_id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"recruiter_id": string,"requisition_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"id"?: string,"recruiter_id"?: string,"requisition_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "requisition_assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisition_assignments_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisition_assignments_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "employer_requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisition_assignments_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "requisitions"
      referencedColumns: ["id"]
    }
                  ]
                },"requisitions": {
                  Row: {
                    "city": string | null,"closed_at": string | null,"closed_reason": string | null,"created_at": string,"created_by": string | null,"deleted_at": string | null,"description": string | null,"desk": string,"employer_id": string,"engagement_type": string,"headcount": number,"id": string,"internal_notes": string | null,"lead_id": string | null,"opened_at": string | null,"owner_id": string | null,"salary_currency": string,"salary_max": number | null,"salary_min": number | null,"salary_unit": string | null,"specialty": string | null,"state": string | null,"status": string,"target_start": string | null,"title": string,"updated_at": string,"work_mode": string | null
                  }
                  Insert: {
                    "city"?: string | null,"closed_at"?: string | null,"closed_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"desk": string,"employer_id": string,"engagement_type": string,"headcount"?: number,"id"?: string,"internal_notes"?: string | null,"lead_id"?: string | null,"opened_at"?: string | null,"owner_id"?: string | null,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string,"target_start"?: string | null,"title": string,"updated_at"?: string,"work_mode"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"closed_at"?: string | null,"closed_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"desk"?: string,"employer_id"?: string,"engagement_type"?: string,"headcount"?: number,"id"?: string,"internal_notes"?: string | null,"lead_id"?: string | null,"opened_at"?: string | null,"owner_id"?: string | null,"salary_currency"?: string,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string,"target_start"?: string | null,"title"?: string,"updated_at"?: string,"work_mode"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "requisitions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisitions_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "requisitions_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisitions_engagement_type_fkey"
      columns: ["engagement_type"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "requisitions_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisitions_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisitions_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "requisitions_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "requisitions_work_mode_fkey"
      columns: ["work_mode"]
isOneToOne: false
      referencedRelation: "work_modes"
      referencedColumns: ["slug"]
    }
                  ]
                },"resume_submissions": {
                  Row: {
                    "candidate_id": string | null,"city": string | null,"consent_future_roles": boolean,"consent_recorded_at": string,"consent_store": boolean,"created_at": string,"created_by": string | null,"deleted_at": string | null,"desk": string | null,"email": string,"email_normalized": string | null,"engagement_types": (string)[],"full_name": string,"held_at": string | null,"id": string,"linkedin_url": string | null,"message": string | null,"owner_id": string | null,"phone": string | null,"resume_filename": string | null,"resume_mime_type": string | null,"resume_size_bytes": number | null,"resume_storage_path": string | null,"specialty": string | null,"state": string | null,"status": string,"submission_key": string | null,"updated_at": string,"work_authorized": boolean | null
                  }
                  Insert: {
                    "candidate_id"?: string | null,"city"?: string | null,"consent_future_roles"?: boolean,"consent_recorded_at"?: string,"consent_store": boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string | null,"email": string,"email_normalized"?: never,"engagement_types"?: (string)[],"full_name": string,"held_at"?: string | null,"id"?: string,"linkedin_url"?: string | null,"message"?: string | null,"owner_id"?: string | null,"phone"?: string | null,"resume_filename"?: string | null,"resume_mime_type"?: string | null,"resume_size_bytes"?: number | null,"resume_storage_path"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string,"submission_key"?: string | null,"updated_at"?: string,"work_authorized"?: boolean | null
                  }
                  Update: {
                    "candidate_id"?: string | null,"city"?: string | null,"consent_future_roles"?: boolean,"consent_recorded_at"?: string,"consent_store"?: boolean,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"desk"?: string | null,"email"?: string,"email_normalized"?: never,"engagement_types"?: (string)[],"full_name"?: string,"held_at"?: string | null,"id"?: string,"linkedin_url"?: string | null,"message"?: string | null,"owner_id"?: string | null,"phone"?: string | null,"resume_filename"?: string | null,"resume_mime_type"?: string | null,"resume_size_bytes"?: number | null,"resume_storage_path"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string,"submission_key"?: string | null,"updated_at"?: string,"work_authorized"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "resume_submissions_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resume_submissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resume_submissions_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "resume_submissions_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resume_submissions_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "resume_submissions_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    }
                  ]
                },"retention_rules": {
                  Row: {
                    "citation": string,"code": string,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"record_kinds": (string)[],"retention_period": string,"scope_note": string,"state": string | null,"updated_at": string
                  }
                  Insert: {
                    "citation": string,"code": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"record_kinds": (string)[],"retention_period": string,"scope_note": string,"state"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "citation"?: string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"record_kinds"?: (string)[],"retention_period"?: string,"scope_note"?: string,"state"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "retention_rules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "retention_rules_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    }
                  ]
                },"specialties": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"desk": string,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"desk": string,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"desk"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "specialties_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "specialties_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    }
                  ]
                },"storage_erasures": {
                  Row: {
                    "attempts": number,"bucket": string,"claim_token": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"deletion_request_id": string | null,"id": string,"last_attempt_at": string | null,"last_error_state": string | null,"needs_attention_at": string | null,"next_attempt_at": string,"object_path": string | null,"outcome": string | null,"present_at_claim": boolean | null,"reason": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "attempts"?: number,"bucket": string,"claim_token"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deletion_request_id"?: string | null,"id"?: string,"last_attempt_at"?: string | null,"last_error_state"?: string | null,"needs_attention_at"?: string | null,"next_attempt_at"?: string,"object_path"?: string | null,"outcome"?: string | null,"present_at_claim"?: boolean | null,"reason"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"bucket"?: string,"claim_token"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deletion_request_id"?: string | null,"id"?: string,"last_attempt_at"?: string | null,"last_error_state"?: string | null,"needs_attention_at"?: string | null,"next_attempt_at"?: string,"object_path"?: string | null,"outcome"?: string | null,"present_at_claim"?: boolean | null,"reason"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "storage_erasures_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "storage_erasures_deletion_request_id_fkey"
      columns: ["deletion_request_id"]
isOneToOne: false
      referencedRelation: "deletion_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"created_by": string | null,"event_type": string,"from_status": string | null,"id": string,"notes": string | null,"occurred_at": string,"submission_id": string,"to_status": string | null,"updated_at": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_type": string,"from_status"?: string | null,"id"?: string,"notes"?: string | null,"occurred_at"?: string,"submission_id": string,"to_status"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_type"?: string,"from_status"?: string | null,"id"?: string,"notes"?: string | null,"occurred_at"?: string,"submission_id"?: string,"to_status"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_events_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submission_documents"
      referencedColumns: ["submission_id"]
    },{
      foreignKeyName: "submission_events_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "employer_submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_events_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_statuses": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"is_system": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_system"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_statuses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "application_id": string | null,"bdm_decision": string,"bdm_decision_at": string | null,"bdm_id": string | null,"bdm_notes": string | null,"candidate_consent_at": string | null,"candidate_consent_obtained": boolean,"candidate_id": string,"created_at": string,"created_by": string | null,"deleted_at": string | null,"direct_submission": boolean,"employer_response": string | null,"employer_response_at": string | null,"id": string,"rate_or_salary": number | null,"rate_unit": string | null,"requisition_id": string,"sent_to_employer_at": string | null,"shared_document_id": string | null,"status": string,"submitted_by": string,"updated_at": string
                  }
                  Insert: {
                    "application_id"?: string | null,"bdm_decision"?: string,"bdm_decision_at"?: string | null,"bdm_id"?: string | null,"bdm_notes"?: string | null,"candidate_consent_at"?: string | null,"candidate_consent_obtained"?: boolean,"candidate_id": string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"direct_submission"?: boolean,"employer_response"?: string | null,"employer_response_at"?: string | null,"id"?: string,"rate_or_salary"?: number | null,"rate_unit"?: string | null,"requisition_id": string,"sent_to_employer_at"?: string | null,"shared_document_id"?: string | null,"status"?: string,"submitted_by": string,"updated_at"?: string
                  }
                  Update: {
                    "application_id"?: string | null,"bdm_decision"?: string,"bdm_decision_at"?: string | null,"bdm_id"?: string | null,"bdm_notes"?: string | null,"candidate_consent_at"?: string | null,"candidate_consent_obtained"?: boolean,"candidate_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted_at"?: string | null,"direct_submission"?: boolean,"employer_response"?: string | null,"employer_response_at"?: string | null,"id"?: string,"rate_or_salary"?: number | null,"rate_unit"?: string | null,"requisition_id"?: string,"sent_to_employer_at"?: string | null,"shared_document_id"?: string | null,"status"?: string,"submitted_by"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_application_same_candidate"
      columns: ["application_id","candidate_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id","candidate_id"]
    },{
      foreignKeyName: "submissions_bdm_id_fkey"
      columns: ["bdm_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_document_same_candidate"
      columns: ["shared_document_id","candidate_id"]
isOneToOne: false
      referencedRelation: "candidate_documents"
      referencedColumns: ["id","candidate_id"]
    },{
      foreignKeyName: "submissions_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "employer_requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_status_fkey"
      columns: ["status"]
isOneToOne: false
      referencedRelation: "submission_statuses"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "submissions_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"us_states": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "us_states_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_modes": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_modes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "employer_requisitions": {
                  Row: {
                    "city": string | null,"closed_at": string | null,"description": string | null,"desk": string | null,"employer_id": string | null,"engagement_type": string | null,"headcount": number | null,"id": string | null,"opened_at": string | null,"salary_currency": string | null,"salary_max": number | null,"salary_min": number | null,"salary_unit": string | null,"specialty": string | null,"state": string | null,"status": string | null,"target_start": string | null,"title": string | null,"work_mode": string | null
                  }
                  Insert: {
                           "city"?: string | null,"closed_at"?: string | null,"description"?: string | null,"desk"?: string | null,"employer_id"?: string | null,"engagement_type"?: string | null,"headcount"?: number | null,"id"?: string | null,"opened_at"?: string | null,"salary_currency"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string | null,"target_start"?: string | null,"title"?: string | null,"work_mode"?: string | null
                         }
                        Update: {
                           "city"?: string | null,"closed_at"?: string | null,"description"?: string | null,"desk"?: string | null,"employer_id"?: string | null,"engagement_type"?: string | null,"headcount"?: number | null,"id"?: string | null,"opened_at"?: string | null,"salary_currency"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"specialty"?: string | null,"state"?: string | null,"status"?: string | null,"target_start"?: string | null,"title"?: string | null,"work_mode"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "requisitions_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "requisitions_employer_id_fkey"
      columns: ["employer_id"]
isOneToOne: false
      referencedRelation: "employers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requisitions_engagement_type_fkey"
      columns: ["engagement_type"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "requisitions_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "requisitions_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "requisitions_work_mode_fkey"
      columns: ["work_mode"]
isOneToOne: false
      referencedRelation: "work_modes"
      referencedColumns: ["slug"]
    }
                  ]
                },"employer_submission_documents": {
                  Row: {
                    "id": string | null,"kind": string | null,"mime_type": string | null,"original_filename": string | null,"size_bytes": number | null,"storage_path": string | null,"submission_id": string | null,"uploaded_at": string | null,"version": number | null
                  }
                  Relationships: [
                    
                  ]
                },"employer_submissions": {
                  Row: {
                    "candidate_city": string | null,"candidate_email": string | null,"candidate_id": string | null,"candidate_linkedin_url": string | null,"candidate_name": string | null,"candidate_phone": string | null,"candidate_state": string | null,"desk": string | null,"employer_response": string | null,"employer_response_at": string | null,"id": string | null,"rate_or_salary": number | null,"rate_unit": string | null,"requisition_id": string | null,"sent_to_employer_at": string | null,"shared_document_id": string | null,"specialty": string | null,"status": string | null,"work_authorized": boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidates_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "candidates_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "candidates_state_fkey"
      columns: ["candidate_state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "submissions_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_document_same_candidate"
      columns: ["shared_document_id","candidate_id"]
isOneToOne: false
      referencedRelation: "candidate_documents"
      referencedColumns: ["id","candidate_id"]
    },{
      foreignKeyName: "submissions_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "employer_requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_requisition_id_fkey"
      columns: ["requisition_id"]
isOneToOne: false
      referencedRelation: "requisitions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_status_fkey"
      columns: ["status"]
isOneToOne: false
      referencedRelation: "submission_statuses"
      referencedColumns: ["slug"]
    }
                  ]
                },"public_jobs": {
                  Row: {
                    "canonical_url": string | null,"city": string | null,"desk": string | null,"engagement_type": string | null,"expires_at": string | null,"id": string | null,"public_description": string | null,"published_at": string | null,"salary_currency": string | null,"salary_max": number | null,"salary_min": number | null,"salary_unit": string | null,"seo_description": string | null,"seo_title": string | null,"slug": string | null,"specialty": string | null,"state": string | null,"title": string | null,"work_mode": string | null
                  }
                  Insert: {
                           "canonical_url"?: string | null,"city"?: string | null,"desk"?: string | null,"engagement_type"?: string | null,"expires_at"?: string | null,"id"?: string | null,"public_description"?: string | null,"published_at"?: string | null,"salary_currency"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string | null,"specialty"?: string | null,"state"?: string | null,"title"?: string | null,"work_mode"?: string | null
                         }
                        Update: {
                           "canonical_url"?: string | null,"city"?: string | null,"desk"?: string | null,"engagement_type"?: string | null,"expires_at"?: string | null,"id"?: string | null,"public_description"?: string | null,"published_at"?: string | null,"salary_currency"?: string | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_unit"?: string | null,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string | null,"specialty"?: string | null,"state"?: string | null,"title"?: string | null,"work_mode"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "jobs_desk_fkey"
      columns: ["desk"]
isOneToOne: false
      referencedRelation: "desks"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "jobs_engagement_type_fkey"
      columns: ["engagement_type"]
isOneToOne: false
      referencedRelation: "engagement_types"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "jobs_specialty_on_desk"
      columns: ["desk","specialty"]
isOneToOne: false
      referencedRelation: "specialties"
      referencedColumns: ["desk","slug"]
    },{
      foreignKeyName: "jobs_state_fkey"
      columns: ["state"]
isOneToOne: false
      referencedRelation: "us_states"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "jobs_work_mode_fkey"
      columns: ["work_mode"]
isOneToOne: false
      referencedRelation: "work_modes"
      referencedColumns: ["slug"]
    }
                  ]
                }
          }
          Functions: {
            "accept_deletion_request":
{ Args: { "p_execute_after"?: string,"p_request_id": string,"p_verification_method": string }; Returns: string
                           },
"can_send_message":
{ Args: { "p_candidate_id": string,"p_channel": string,"p_employer_contact_id": string }; Returns: boolean
                           },
"cancel_deletion_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"claim_storage_erasures":
{ Args: { "p_lease"?: string,"p_limit"?: number }; Returns: {
              "bucket": string,"claim_token": string,"id": string,"object_path": string,"present": boolean
            }[]
                           },
"complete_storage_erasure":
{ Args: { "p_claim_token": string,"p_id": string }; Returns: string
                           },
"fail_storage_erasure":
{ Args: { "p_claim_token": string,"p_error_code": string,"p_id": string }; Returns: string
                           },
"normalize_company_name":
{ Args: { "value": string }; Returns: string
                           },
"normalize_email":
{ Args: { "value": string }; Returns: string
                           },
"place_legal_hold":
{ Args: { "p_candidate_id": string,"p_matter_reference"?: string,"p_reason": string }; Returns: string
                           },
"process_due_deletion_requests":
{ Args: { "p_limit"?: number }; Returns: number
                           },
"record_deletion_request":
{ Args: { "p_candidate_id": string,"p_manner": string }; Returns: string
                           },
"record_opt_out":
{ Args: { "p_candidate_id": string,"p_channel": string,"p_employer_contact_id": string,"p_source": string,"p_source_detail"?: string }; Returns: undefined
                           },
"refuse_deletion_request":
{ Args: { "p_basis": string,"p_request_id": string }; Returns: undefined
                           },
"release_legal_hold":
{ Args: { "p_hold_id": string }; Returns: undefined
                           },
"request_my_deletion":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"storage_erasure_backlog":
{ Args: Record<PropertyKey, never>; Returns: {
              "needs_attention": number,"oldest_attention_at": string,"oldest_pending_at": string,"pending": number
            }[]
                           },
"sweep_orphaned_storage_objects":
{ Args: { "p_grace"?: string }; Returns: number
                           }
          }
          Enums: {
            "app_role": "super_admin"|"platform_admin"|"bdm"|"full_desk_recruiter"|"recruiter"|"research_analyst"|"content_manager"|"marketing_manager"|"employer_user"|"job_seeker"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["super_admin", "platform_admin", "bdm", "full_desk_recruiter", "recruiter", "research_analyst", "content_manager", "marketing_manager", "employer_user", "job_seeker"]
          }
        }
} as const
