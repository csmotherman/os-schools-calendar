export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'PROGRAM_USER' | 'ADMIN'
export type AccountStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'DISABLED'
export type MembershipStatus = 'PENDING' | 'APPROVED' | 'DECLINED'
export type CalendarStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED'
export type DayLength = 'PART' | 'FULL'
export type RequirementMetric = 'SESSION_DAYS' | 'ACTIVITY_DAYS'
export type RequirementSeverity = 'BLOCK' | 'WARNING'
export type BlockedDateRestriction = 'NO_SESSION' | 'NO_ACTIVITY'

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type Table<Row, Insert, Update, Relationships extends Relationship[] = Relationship[]> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relationships
}

export type Database = {
  public: {
    Tables: {
      programs: Table<
        { id: string; name: string; active: boolean; created_at: string; updated_at: string },
        { id?: string; name: string; active?: boolean; created_at?: string; updated_at?: string },
        { id?: string; name?: string; active?: boolean; created_at?: string; updated_at?: string }
      >
      profiles: Table<
        { id: string; first_name: string; last_name: string; role: UserRole; account_status: AccountStatus; created_at: string; updated_at: string },
        { id: string; first_name: string; last_name: string; role?: UserRole; account_status?: AccountStatus; created_at?: string; updated_at?: string },
        { first_name?: string; last_name?: string; role?: UserRole; account_status?: AccountStatus; updated_at?: string }
      >
      program_memberships: Table<
        { id: string; user_id: string; program_id: string; status: MembershipStatus; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string },
        { id?: string; user_id: string; program_id: string; status?: MembershipStatus; approved_by?: string | null; approved_at?: string | null; created_at?: string; updated_at?: string },
        { status?: MembershipStatus; approved_by?: string | null; approved_at?: string | null; updated_at?: string }
      >
      school_years: Table<
        { id: string; name: string; start_date: string; end_date: string; active: boolean; created_at: string; updated_at: string },
        { id?: string; name: string; start_date: string; end_date: string; active?: boolean; created_at?: string; updated_at?: string },
        { name?: string; start_date?: string; end_date?: string; active?: boolean; updated_at?: string }
      >
      calendar_types: Table<
        { id: string; code: string; name: string; days_per_week: number; day_length: DayLength; active: boolean; display_order: number; created_at: string; updated_at: string },
        { id?: string; code: string; name: string; days_per_week: number; day_length: DayLength; active?: boolean; display_order?: number; created_at?: string; updated_at?: string },
        { code?: string; name?: string; days_per_week?: number; day_length?: DayLength; active?: boolean; display_order?: number; updated_at?: string }
      >
      activity_types: Table<
        { id: string; code: string; name: string; allowed_when_in_session: boolean; allowed_when_not_in_session: boolean; active: boolean; display_order: number; created_at: string; updated_at: string },
        { id?: string; code: string; name: string; allowed_when_in_session?: boolean; allowed_when_not_in_session?: boolean; active?: boolean; display_order?: number; created_at?: string; updated_at?: string },
        { code?: string; name?: string; allowed_when_in_session?: boolean; allowed_when_not_in_session?: boolean; active?: boolean; display_order?: number; updated_at?: string }
      >
      calendars: Table<
        { id: string; program_id: string; school_year_id: string; calendar_type_id: string; start_date: string; end_date: string; status: CalendarStatus; created_by: string; submitted_by: string | null; submitted_at: string | null; approved_by: string | null; approved_at: string | null; review_notes: string | null; created_at: string; updated_at: string },
        { id?: string; program_id: string; school_year_id: string; calendar_type_id: string; start_date: string; end_date: string; status?: CalendarStatus; created_by: string; submitted_by?: string | null; submitted_at?: string | null; approved_by?: string | null; approved_at?: string | null; review_notes?: string | null; created_at?: string; updated_at?: string },
        { start_date?: string; end_date?: string; calendar_type_id?: string; status?: CalendarStatus; submitted_by?: string | null; submitted_at?: string | null; approved_by?: string | null; approved_at?: string | null; review_notes?: string | null; updated_at?: string }
      >
      calendar_days: Table<
        { id: string; calendar_id: string; date: string; in_session: boolean; notes: string | null; created_at: string; updated_at: string },
        { id?: string; calendar_id: string; date: string; in_session?: boolean; notes?: string | null; created_at?: string; updated_at?: string },
        { date?: string; in_session?: boolean; notes?: string | null; updated_at?: string }
      >
      calendar_day_activities: Table<
        { id: string; calendar_day_id: string; activity_type_id: string; created_at: string },
        { id?: string; calendar_day_id: string; activity_type_id: string; created_at?: string },
        { activity_type_id?: string }
      >
      requirements: Table<
        { id: string; school_year_id: string; calendar_type_id: string; metric_type: RequirementMetric; activity_type_id: string | null; minimum_count: number | null; maximum_count: number | null; severity: RequirementSeverity; active: boolean; created_at: string; updated_at: string },
        { id?: string; school_year_id: string; calendar_type_id: string; metric_type: RequirementMetric; activity_type_id?: string | null; minimum_count?: number | null; maximum_count?: number | null; severity?: RequirementSeverity; active?: boolean; created_at?: string; updated_at?: string },
        { minimum_count?: number | null; maximum_count?: number | null; severity?: RequirementSeverity; active?: boolean; updated_at?: string }
      >
      blocked_dates: Table<
        { id: string; school_year_id: string; date: string; name: string; restriction_type: BlockedDateRestriction; active: boolean; created_by: string | null; created_at: string; updated_at: string },
        { id?: string; school_year_id: string; date: string; name: string; restriction_type?: BlockedDateRestriction; active?: boolean; created_by?: string | null; created_at?: string; updated_at?: string },
        { date?: string; name?: string; restriction_type?: BlockedDateRestriction; active?: boolean; updated_at?: string }
      >
      audit_log: Table<
        { id: number; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; program_id: string | null; calendar_id: string | null; before_data: Json | null; after_data: Json | null; created_at: string },
        { id?: never; actor_user_id?: string | null; action: string; entity_type: string; entity_id?: string | null; program_id?: string | null; calendar_id?: string | null; before_data?: Json | null; after_data?: Json | null; created_at?: string },
        { actor_user_id?: string | null; action?: string; entity_type?: string; entity_id?: string | null; program_id?: string | null; calendar_id?: string | null; before_data?: Json | null; after_data?: Json | null }
      >
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      has_program_access: { Args: { check_program_id: string; check_user_id?: string }; Returns: boolean }
      list_active_programs: { Args: Record<string, never>; Returns: { id: string; name: string }[] }
      admin_approve_access: { Args: { target_membership_id: string }; Returns: undefined }
      admin_decline_access: { Args: { target_membership_id: string }; Returns: undefined }
      admin_disable_user: { Args: { target_user_id: string }; Returns: undefined }
      update_calendar_details: { Args: { target_calendar_id: string; new_start_date: string; new_end_date: string; new_calendar_type_id: string }; Returns: undefined }
      submit_calendar: { Args: { target_calendar_id: string }; Returns: undefined }
      approve_calendar: { Args: { target_calendar_id: string; notes?: string | null }; Returns: undefined }
      request_calendar_changes: { Args: { target_calendar_id: string; notes: string }; Returns: undefined }
      calendar_is_program_editable: { Args: { target_calendar_id: string }; Returns: boolean }
      create_calendar_with_days: { Args: { target_program_id: string; target_school_year_id: string; target_calendar_type_id: string; target_start_date: string; target_end_date: string; generated_days: Json }; Returns: string }
      save_calendar_day: { Args: { target_day_id: string; new_in_session: boolean; new_notes: string; new_activity_type_ids?: string[] }; Returns: undefined }
      calendar_has_blocking_requirement_failures: { Args: { target_calendar_id: string }; Returns: boolean }
      update_own_profile_names: { Args: { new_first_name: string; new_last_name: string }; Returns: undefined }
      resubmit_program_request: { Args: { target_membership_id: string }; Returns: undefined }
    }
    Enums: {
      user_role: UserRole
      account_status: AccountStatus
      membership_status: MembershipStatus
      calendar_status: CalendarStatus
      day_length: DayLength
      requirement_metric: RequirementMetric
      requirement_severity: RequirementSeverity
      blocked_date_restriction: BlockedDateRestriction
    }
    CompositeTypes: Record<string, never>
  }
}
