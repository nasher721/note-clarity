/**
 * Type mappings between application types and Supabase database enums
 * These ensure type safety when interacting with the database
 */

// Database enum types (must match Supabase schema)
export type DbChunkType = 
  | 'section_header' 
  | 'paragraph' 
  | 'bullet_list' 
  | 'imaging_report' 
  | 'lab_values' 
  | 'medication_list' 
  | 'vital_signs' 
  | 'attestation' 
  | 'unknown';

export type DbPrimaryLabel = 'KEEP' | 'CONDENSE' | 'REMOVE';

export type DbLabelScope = 'this_document' | 'note_type' | 'service' | 'global';

/**
 * Helper to cast application types to database types
 */
export function toDbLabel(label: string): DbPrimaryLabel {
  return label as DbPrimaryLabel;
}

export function toDbScope(scope: string): DbLabelScope {
  return scope as DbLabelScope;
}

export function toDbChunkType(type: string): DbChunkType {
  return type as DbChunkType;
}
