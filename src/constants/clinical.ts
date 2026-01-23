import { ChunkType } from '@/types/clinical';

/**
 * Human-readable labels for chunk types
 */
export const CHUNK_TYPE_LABELS: Record<ChunkType, string> = {
  section_header: 'Header',
  paragraph: 'Paragraph',
  bullet_list: 'List',
  imaging_report: 'Imaging',
  lab_values: 'Labs',
  medication_list: 'Medications',
  vital_signs: 'Vitals',
  attestation: 'Attestation',
  unknown: 'Text',
};

/**
 * Section headers recognized by the chunk parser
 */
export const SECTION_HEADERS = [
  'CHIEF COMPLAINT',
  'HISTORY OF PRESENT ILLNESS',
  'HPI',
  'PAST MEDICAL HISTORY',
  'PMH',
  'MEDICATIONS',
  'ALLERGIES',
  'SOCIAL HISTORY',
  'FAMILY HISTORY',
  'REVIEW OF SYSTEMS',
  'ROS',
  'PHYSICAL EXAM',
  'VITAL SIGNS',
  'ASSESSMENT',
  'PLAN',
  'ASSESSMENT AND PLAN',
  'A/P',
  'LABS',
  'IMAGING',
  'PROCEDURES',
  'DISPOSITION',
  'ATTENDING ATTESTATION',
] as const;

/**
 * Patterns for detecting critical clinical content
 */
export const CRITICAL_PATTERNS = {
  allergies: /\b(allerg|NKDA|no known drug allergies)\b/i,
  anticoagulation: /\b(warfarin|coumadin|heparin|enoxaparin|lovenox|rivaroxaban|xarelto|apixaban|eliquis|dabigatran|pradaxa|INR|anticoagul)/i,
  code_status: /\b(DNR|DNI|full code|code status|goals of care|comfort care|hospice|CMO|comfort measures)\b/i,
  infusions: /\b(drip|infusion|gtt|mcg\/kg\/min|units\/hr|mg\/hr|vasopressor|norepinephrine|levophed|epinephrine|dopamine|dobutamine|phenylephrine|vasopressin)\b/i,
  lines_drains_airway: /\b(central line|PICC|arterial line|a-line|foley|chest tube|JP drain|NG tube|ETT|trach|ventilat|intubat|extubat)\b/i,
} as const;

/**
 * Patterns for detecting boilerplate/attestation text
 */
export const BOILERPLATE_PATTERNS = [
  /I have personally seen and examined the patient/i,
  /I was present for the key portions/i,
  /I agree with the resident's assessment/i,
  /The above note was reviewed and edited/i,
  /electronically signed by/i,
  /This note was generated/i,
  /attestation/i,
] as const;
