export type PrimaryLabel = 'KEEP' | 'CONDENSE' | 'REMOVE';

export type RemoveReason =
  | 'duplicate_data'
  | 'copied_prior_note'
  | 'boilerplate_template'
  | 'billing_attestation'
  | 'normal_ros_exam'
  | 'repeated_imaging'
  | 'repeated_labs'
  | 'irrelevant_historical'
  | 'administrative_text';

export type CondenseStrategy =
  | 'abnormal_only'
  | 'changes_vs_prior'
  | 'one_line_summary'
  | 'problem_based_summary';

export type LabelScope =
  | 'this_document'
  | 'note_type'
  | 'service'
  | 'global';

export type ChunkType =
  | 'section_header'
  | 'paragraph'
  | 'bullet_list'
  | 'imaging_report'
  | 'lab_values'
  | 'medication_list'
  | 'vital_signs'
  | 'attestation'
  | 'unknown';

export interface DocumentChunk {
  id: string;
  text: string;
  type: ChunkType;
  startIndex: number;
  endIndex: number;
  isCritical: boolean;
  criticalType?: 'allergies' | 'anticoagulation' | 'code_status' | 'infusions' | 'lines_drains_airway';
  confidence?: number;
  suggestedLabel?: PrimaryLabel;
}

export interface ChunkAnnotation {
  chunkId: string;
  rawText: string;
  sectionType: ChunkType;
  label: PrimaryLabel;
  removeReason?: RemoveReason;
  condenseStrategy?: CondenseStrategy;
  scope: LabelScope;
  timestamp: Date;
  userId: string;
  overrideJustification?: string;
}

// Text highlight annotation for free-form selection
export interface TextHighlight {
  id: string;
  startIndex: number;
  endIndex: number;
  text: string;
  label: PrimaryLabel;
  removeReason?: RemoveReason;
  condenseStrategy?: CondenseStrategy;
  scope: LabelScope;
  timestamp: Date;
  userId: string;
}

export interface ClinicalDocument {
  id: string;
  originalText: string;
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
  createdAt: Date;
  noteType?: string;
  service?: string;
}

export const REMOVE_REASON_LABELS: Record<RemoveReason, string> = {
  duplicate_data: 'Duplicate data',
  copied_prior_note: 'Complete copied prior note',
  boilerplate_template: 'Boilerplate/template text',
  billing_attestation: 'Billing/compliance attestation',
  normal_ros_exam: 'Normal ROS / normal exam autopopulation',
  repeated_imaging: 'Repeated imaging report (unchanged)',
  repeated_labs: 'Repeated labs (unchanged)',
  irrelevant_historical: 'Irrelevant historical data',
  administrative_text: 'Administrative / non-clinical text',
};

export const CONDENSE_STRATEGY_LABELS: Record<CondenseStrategy, string> = {
  abnormal_only: 'Abnormal values only',
  changes_vs_prior: 'Changes vs prior',
  one_line_summary: 'One-line summary',
  problem_based_summary: 'Merge into problem-based summary',
};

export const SCOPE_LABELS: Record<LabelScope, string> = {
  this_document: 'This document only',
  note_type: 'This note type',
  service: 'This service',
  global: 'Global rule',
};

// Re-export batch and chart types for convenience
export interface BatchQueueItem {
  id: string;
  text: string;
  noteType?: string;
  service?: string;
  patientId?: string;
  status: 'pending' | 'processing' | 'completed';
  document?: ClinicalDocument;
  annotationCount: number;
}

export interface NoteItem {
  id: string;
  noteType: string;
  dateTime?: string;
  status: 'pending' | 'completed';
  annotationCount: number;
  chunkCount: number;
}
