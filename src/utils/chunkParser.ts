import { DocumentChunk, ChunkType } from '@/types/clinical';

const SECTION_HEADERS = [
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
];

const CRITICAL_PATTERNS = {
  allergies: /\b(allerg|NKDA|no known drug allergies)\b/i,
  anticoagulation: /\b(warfarin|coumadin|heparin|enoxaparin|lovenox|rivaroxaban|xarelto|apixaban|eliquis|dabigatran|pradaxa|INR|anticoagul)/i,
  code_status: /\b(DNR|DNI|full code|code status|goals of care|comfort care|hospice|CMO|comfort measures)\b/i,
  infusions: /\b(drip|infusion|gtt|mcg\/kg\/min|units\/hr|mg\/hr|vasopressor|norepinephrine|levophed|epinephrine|dopamine|dobutamine|phenylephrine|vasopressin)\b/i,
  lines_drains_airway: /\b(central line|PICC|arterial line|a-line|foley|chest tube|JP drain|NG tube|ETT|trach|ventilat|intubat|extubat)\b/i,
};

const BOILERPLATE_PATTERNS = [
  /I have personally seen and examined the patient/i,
  /I was present for the key portions/i,
  /I agree with the resident's assessment/i,
  /The above note was reviewed and edited/i,
  /electronically signed by/i,
  /This note was generated/i,
  /attestation/i,
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function detectChunkType(text: string): ChunkType {
  const trimmed = text.trim().toUpperCase();
  
  if (SECTION_HEADERS.some(h => trimmed.startsWith(h))) {
    return 'section_header';
  }
  
  if (/^[-•*]\s/.test(text.trim()) || /^\d+\.\s/.test(text.trim())) {
    return 'bullet_list';
  }
  
  if (/\b(CT|MRI|X-ray|ultrasound|echo|EKG|impression|findings)\b/i.test(text)) {
    return 'imaging_report';
  }
  
  if (/\b(WBC|Hgb|Plt|Na|K|Cr|BUN|Glucose|AST|ALT|Bili)\b/.test(text) && /\d/.test(text)) {
    return 'lab_values';
  }
  
  if (/\b(BP|HR|RR|Temp|SpO2|O2 sat)\b/i.test(text) && /\d/.test(text)) {
    return 'vital_signs';
  }
  
  if (/\b(mg|mcg|units|tablet|capsule|daily|BID|TID|QID|PRN)\b/i.test(text)) {
    return 'medication_list';
  }
  
  if (BOILERPLATE_PATTERNS.some(p => p.test(text))) {
    return 'attestation';
  }
  
  return text.length > 200 ? 'paragraph' : 'unknown';
}

function detectCriticalContent(text: string): { isCritical: boolean; criticalType?: DocumentChunk['criticalType'] } {
  for (const [type, pattern] of Object.entries(CRITICAL_PATTERNS)) {
    if (pattern.test(text)) {
      return { isCritical: true, criticalType: type as DocumentChunk['criticalType'] };
    }
  }
  return { isCritical: false };
}

function suggestLabel(text: string, type: ChunkType): { label?: 'KEEP' | 'CONDENSE' | 'REMOVE'; confidence: number } {
  // Attestations are likely removable
  if (type === 'attestation') {
    return { label: 'REMOVE', confidence: 0.85 };
  }
  
  // Boilerplate detection
  if (BOILERPLATE_PATTERNS.some(p => p.test(text))) {
    return { label: 'REMOVE', confidence: 0.8 };
  }
  
  // Section headers should be kept
  if (type === 'section_header') {
    return { label: 'KEEP', confidence: 0.9 };
  }
  
  // Long lab sections might be condensable
  if (type === 'lab_values' && text.length > 300) {
    return { label: 'CONDENSE', confidence: 0.6 };
  }
  
  return { confidence: 0 };
}

export function parseDocument(text: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  // Split by double newlines or section headers
  const sections = text.split(/(?=\n\n|\n(?=[A-Z]{2,}[:\s]))/);
  
  let currentIndex = 0;
  
  for (const section of sections) {
    if (!section.trim()) {
      currentIndex += section.length;
      continue;
    }
    
    // Further split long sections into paragraphs
    const paragraphs = section.split(/\n{2,}/);
    
    for (const para of paragraphs) {
      if (!para.trim()) {
        currentIndex += para.length + 1;
        continue;
      }
      
      const type = detectChunkType(para);
      const { isCritical, criticalType } = detectCriticalContent(para);
      const { label, confidence } = suggestLabel(para, type);
      
      chunks.push({
        id: generateId(),
        text: para.trim(),
        type,
        startIndex: currentIndex,
        endIndex: currentIndex + para.length,
        isCritical,
        criticalType,
        confidence: confidence || undefined,
        suggestedLabel: label,
      });
      
      currentIndex += para.length + 1;
    }
  }
  
  return chunks.filter(c => c.text.length > 0);
}

export function findDuplicates(chunks: DocumentChunk[]): Set<string> {
  const duplicates = new Set<string>();
  const textMap = new Map<string, string[]>();
  
  for (const chunk of chunks) {
    const normalized = chunk.text.toLowerCase().trim();
    if (normalized.length < 50) continue;
    
    const existing = textMap.get(normalized);
    if (existing) {
      existing.push(chunk.id);
      duplicates.add(chunk.id);
      existing.forEach(id => duplicates.add(id));
    } else {
      textMap.set(normalized, [chunk.id]);
    }
  }
  
  return duplicates;
}
