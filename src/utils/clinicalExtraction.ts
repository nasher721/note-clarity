import { DocumentChunk } from '@/types/clinical';

export type ExtractedFieldCategory =
  | 'vital_signs'
  | 'lab_value'
  | 'medication'
  | 'diagnosis'
  | 'procedure'
  | 'date_time'
  | 'key_value'
  | 'allergy'
  | 'problem'
  | 'icd_code'
  | 'cpt_code'
  | 'provider'
  | 'location'
  | 'temporal'
  | 'measurement'
  | 'social_history'
  | 'family_history';

export interface ExtractedField {
  id: string;
  category: ExtractedFieldCategory;
  label: string;
  value: string;
  confidence: number;
  sourceChunkId: string;
  metadata?: Record<string, any>;
}

// ICD-10 code pattern (e.g., A00.0, E11.65, Z87.891)
const ICD10_PATTERN = /\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/g;

// CPT code pattern (e.g., 99213, 99214, 43239)
const CPT_PATTERN = /\b((?:99[0-5]\d{2}|[0-9]{5}))\b/g;

// Common vital signs patterns
const VITAL_PATTERNS = [
  { label: 'Blood Pressure', pattern: /\b(?:BP|blood pressure)[:\s]*(\d{2,3}\/\d{2,3}(?:\s*mmHg)?)/gi, unit: 'mmHg' },
  { label: 'Heart Rate', pattern: /\b(?:HR|heart rate|pulse)[:\s]*(\d{2,3}(?:\s*bpm)?)/gi, unit: 'bpm' },
  { label: 'Respiratory Rate', pattern: /\b(?:RR|respiratory rate|resp rate)[:\s]*(\d{1,2}(?:\s*\/min)?)/gi, unit: '/min' },
  { label: 'Temperature', pattern: /\b(?:Temp|temperature|T)[:\s]*(\d{2,3}(?:\.\d)?\s*(?:°?[FC]|degrees)?)/gi, unit: '°F' },
  { label: 'Oxygen Saturation', pattern: /\b(?:SpO2|O2 sat|oxygen sat(?:uration)?)[:\s]*(\d{2,3}%?)/gi, unit: '%' },
  { label: 'Weight', pattern: /\b(?:Wt|weight)[:\s]*(\d{1,3}(?:\.\d)?\s*(?:kg|lbs?|pounds)?)/gi, unit: 'kg' },
  { label: 'Height', pattern: /\b(?:Ht|height)[:\s]*(\d{1,3}(?:'\d{1,2}"?|\s*(?:cm|in(?:ches)?|ft|feet)?))/gi, unit: 'cm' },
  { label: 'BMI', pattern: /\bBMI[:\s]*(\d{1,2}(?:\.\d)?)/gi, unit: 'kg/m²' },
  { label: 'Pain Score', pattern: /\b(?:pain|pain score|pain level)[:\s]*(\d{1,2}(?:\/10)?)/gi, unit: '/10' },
  { label: 'GCS', pattern: /\b(?:GCS|Glasgow)[:\s]*(\d{1,2}(?:\/15)?)/gi, unit: '/15' },
];

// Comprehensive lab patterns with reference ranges
const LAB_PATTERNS = [
  // CBC
  { label: 'WBC', pattern: /\bWBC[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'K/uL', normalRange: '4.5-11.0' },
  { label: 'Hemoglobin', pattern: /\b(?:Hgb|Hb|hemoglobin)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'g/dL', normalRange: '12-17' },
  { label: 'Hematocrit', pattern: /\b(?:HCT|hematocrit)[:\s]*(\d+(?:\.\d+)?)/gi, unit: '%', normalRange: '36-50' },
  { label: 'Platelets', pattern: /\b(?:Plt|platelets)[:\s]*(\d+)/gi, unit: 'K/uL', normalRange: '150-400' },
  { label: 'MCV', pattern: /\bMCV[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'fL', normalRange: '80-100' },
  { label: 'RDW', pattern: /\bRDW[:\s]*(\d+(?:\.\d+)?)/gi, unit: '%', normalRange: '11.5-14.5' },

  // BMP/CMP
  { label: 'Sodium', pattern: /\b(?:Na|sodium)[:\s]*(\d+)/gi, unit: 'mEq/L', normalRange: '136-145' },
  { label: 'Potassium', pattern: /\b(?:K|potassium)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mEq/L', normalRange: '3.5-5.0' },
  { label: 'Chloride', pattern: /\b(?:Cl|chloride)[:\s]*(\d+)/gi, unit: 'mEq/L', normalRange: '98-106' },
  { label: 'CO2', pattern: /\bCO2[:\s]*(\d+)/gi, unit: 'mEq/L', normalRange: '23-29' },
  { label: 'BUN', pattern: /\bBUN[:\s]*(\d+)/gi, unit: 'mg/dL', normalRange: '7-20' },
  { label: 'Creatinine', pattern: /\b(?:Cr|creatinine)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/dL', normalRange: '0.7-1.3' },
  { label: 'Glucose', pattern: /\b(?:glucose|BG|blood glucose)[:\s]*(\d+)/gi, unit: 'mg/dL', normalRange: '70-100' },
  { label: 'Calcium', pattern: /\b(?:Ca|calcium)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/dL', normalRange: '8.5-10.5' },
  { label: 'Magnesium', pattern: /\b(?:Mg|magnesium)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/dL', normalRange: '1.7-2.2' },
  { label: 'Phosphorus', pattern: /\b(?:Phos|phosphorus)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/dL', normalRange: '2.5-4.5' },

  // LFTs
  { label: 'AST', pattern: /\bAST[:\s]*(\d+)/gi, unit: 'U/L', normalRange: '10-40' },
  { label: 'ALT', pattern: /\bALT[:\s]*(\d+)/gi, unit: 'U/L', normalRange: '7-56' },
  { label: 'Alk Phos', pattern: /\b(?:Alk Phos|ALP|alkaline phosphatase)[:\s]*(\d+)/gi, unit: 'U/L', normalRange: '44-147' },
  { label: 'Total Bilirubin', pattern: /\b(?:T\.? ?Bili|total bilirubin)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/dL', normalRange: '0.1-1.2' },
  { label: 'Direct Bilirubin', pattern: /\b(?:D\.? ?Bili|direct bilirubin)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/dL', normalRange: '0-0.3' },
  { label: 'Albumin', pattern: /\balbumin[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'g/dL', normalRange: '3.5-5.0' },
  { label: 'Total Protein', pattern: /\b(?:TP|total protein)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'g/dL', normalRange: '6.0-8.3' },

  // Coagulation
  { label: 'PT', pattern: /\bPT[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'seconds', normalRange: '11-13.5' },
  { label: 'INR', pattern: /\bINR[:\s]*(\d+(?:\.\d+)?)/gi, unit: '', normalRange: '0.8-1.1' },
  { label: 'PTT', pattern: /\b(?:PTT|aPTT)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'seconds', normalRange: '25-35' },
  { label: 'Fibrinogen', pattern: /\bfibrinogen[:\s]*(\d+)/gi, unit: 'mg/dL', normalRange: '200-400' },

  // Cardiac markers
  { label: 'Troponin', pattern: /\b(?:troponin|TnI|TnT)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'ng/mL', normalRange: '<0.04' },
  { label: 'BNP', pattern: /\bBNP[:\s]*(\d+)/gi, unit: 'pg/mL', normalRange: '<100' },
  { label: 'NT-proBNP', pattern: /\bNT-proBNP[:\s]*(\d+)/gi, unit: 'pg/mL', normalRange: '<300' },

  // Thyroid
  { label: 'TSH', pattern: /\bTSH[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mIU/L', normalRange: '0.4-4.0' },
  { label: 'Free T4', pattern: /\b(?:free T4|FT4)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'ng/dL', normalRange: '0.8-1.8' },

  // Inflammatory markers
  { label: 'CRP', pattern: /\bCRP[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mg/L', normalRange: '<3.0' },
  { label: 'ESR', pattern: /\bESR[:\s]*(\d+)/gi, unit: 'mm/hr', normalRange: '0-20' },
  { label: 'Procalcitonin', pattern: /\b(?:procalcitonin|PCT)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'ng/mL', normalRange: '<0.1' },

  // ABG
  { label: 'pH', pattern: /\bpH[:\s]*(\d+(?:\.\d+)?)/gi, unit: '', normalRange: '7.35-7.45' },
  { label: 'pCO2', pattern: /\bpCO2[:\s]*(\d+)/gi, unit: 'mmHg', normalRange: '35-45' },
  { label: 'pO2', pattern: /\bpO2[:\s]*(\d+)/gi, unit: 'mmHg', normalRange: '80-100' },
  { label: 'HCO3', pattern: /\bHCO3[:\s]*(\d+)/gi, unit: 'mEq/L', normalRange: '22-26' },
  { label: 'Lactate', pattern: /\blactate[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mmol/L', normalRange: '0.5-2.0' },

  // Renal
  { label: 'GFR', pattern: /\b(?:GFR|eGFR)[:\s]*(\d+)/gi, unit: 'mL/min', normalRange: '>90' },
  { label: 'Urine Output', pattern: /\b(?:UOP|urine output)[:\s]*(\d+(?:\.\d+)?)/gi, unit: 'mL/hr', normalRange: '>0.5' },
];

// Medication patterns
const MEDICATION_PATTERNS = [
  // Standard medication with dose
  /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|units?|mL)\s*((?:PO|IV|IM|SQ|SC|SL|PR|topical|inhaled)?\s*(?:daily|BID|TID|QID|q\d+h?|PRN|once|twice|three times|at bedtime|HS)?)/gi,
  // Brand/generic pairs
  /([A-Z][a-zA-Z]+)\s*\(([A-Z][a-zA-Z]+)\)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|units?)/gi,
];

// Temporal patterns for clinical reasoning
const TEMPORAL_PATTERNS = [
  { label: 'Duration', pattern: /\b(?:for|x)\s*(\d+)\s*(days?|weeks?|months?|years?)\b/gi },
  { label: 'Onset', pattern: /\b(?:started|began|onset)\s*(\d+)\s*(days?|weeks?|months?|years?|hours?)\s*(?:ago|prior)/gi },
  { label: 'Since', pattern: /\bsince\s+(\w+\s+\d{1,2}(?:,?\s*\d{4})?)/gi },
  { label: 'Timeline', pattern: /\b(today|yesterday|this morning|last night|earlier today|\d+\s*(?:days?|weeks?|months?)\s*ago)\b/gi },
  { label: 'Hospital Day', pattern: /\b(?:HD|hospital day|post-op day|POD)\s*#?(\d+)/gi },
];

// Provider patterns
const PROVIDER_PATTERNS = [
  /\b(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g,
  /\b(?:attending|resident|fellow|NP|PA|RN)[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/gi,
];

// Social history patterns
const SOCIAL_HISTORY_PATTERNS = [
  { label: 'Smoking', pattern: /\b((?:current|former|never)\s*smoker|(?:\d+)\s*(?:pack[- ]?years?|ppd)|quit\s*(?:\d+\s*(?:years?|months?)\s*ago)?|tobacco)\b/gi },
  { label: 'Alcohol', pattern: /\b((?:social|occasional|heavy)\s*(?:alcohol|drinker|ETOH)|(\d+)\s*(?:drinks?|beers?|glasses?)\s*(?:per|\/)\s*(?:day|week)|denies\s*(?:alcohol|ETOH))\b/gi },
  { label: 'Drugs', pattern: /\b((?:denies|admits|history of)\s*(?:illicit|recreational|IV)?\s*(?:drug|substance)\s*(?:use|abuse)?|(?:marijuana|cocaine|heroin|opioid|meth))\b/gi },
  { label: 'Occupation', pattern: /\b(?:works? as|occupation|employed as|retired)\s*(?:a\s*)?([a-zA-Z\s]+?)(?:\.|,|\n|$)/gi },
];

// Family history patterns
const FAMILY_HISTORY_PATTERNS = [
  { label: 'Family History', pattern: /\b(?:family history|FHx?)[:\s]*(?:of\s*)?([^\n.]+)/gi },
  { label: 'Mother', pattern: /\bmother[:\s]*(?:with|has|had)?\s*([^\n,]+)/gi },
  { label: 'Father', pattern: /\bfather[:\s]*(?:with|has|had)?\s*([^\n,]+)/gi },
];

/**
 * Enhanced field extraction from clinical text
 */
export function extractFieldsFromChunk(chunk: DocumentChunk): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const text = chunk.text;
  const baseConf = chunk.type === 'section_header' ? 0.1 : chunk.isCritical ? 0.08 : 0;

  // Extract ICD-10 codes
  for (const match of text.matchAll(ICD10_PATTERN)) {
    fields.push({
      id: `${chunk.id}-icd-${fields.length}`,
      category: 'icd_code',
      label: 'ICD-10 Code',
      value: match[1],
      confidence: Math.min(0.85 + baseConf, 0.95),
      sourceChunkId: chunk.id,
      metadata: { codeType: 'ICD-10' },
    });
  }

  // Extract CPT codes
  for (const match of text.matchAll(CPT_PATTERN)) {
    const code = match[1];
    // Filter out common false positives (years, zip codes, etc.)
    if (code.startsWith('99') || code.startsWith('0') || parseInt(code) >= 10000) {
      fields.push({
        id: `${chunk.id}-cpt-${fields.length}`,
        category: 'cpt_code',
        label: 'CPT Code',
        value: code,
        confidence: Math.min(0.75 + baseConf, 0.95),
        sourceChunkId: chunk.id,
        metadata: { codeType: 'CPT' },
      });
    }
  }

  // Extract vitals
  for (const vital of VITAL_PATTERNS) {
    for (const match of text.matchAll(vital.pattern)) {
      fields.push({
        id: `${chunk.id}-vital-${vital.label.replace(/\s/g, '')}-${fields.length}`,
        category: 'vital_signs',
        label: vital.label,
        value: match[1].trim(),
        confidence: Math.min(0.8 + baseConf, 0.95),
        sourceChunkId: chunk.id,
        metadata: { unit: vital.unit },
      });
    }
  }

  // Extract labs with reference ranges
  for (const lab of LAB_PATTERNS) {
    for (const match of text.matchAll(lab.pattern)) {
      const value = parseFloat(match[1]);
      const isAbnormal = checkAbnormal(value, lab.normalRange);

      fields.push({
        id: `${chunk.id}-lab-${lab.label.replace(/\s/g, '')}-${fields.length}`,
        category: 'lab_value',
        label: lab.label,
        value: match[1],
        confidence: Math.min(0.78 + baseConf, 0.95),
        sourceChunkId: chunk.id,
        metadata: {
          unit: lab.unit,
          normalRange: lab.normalRange,
          isAbnormal,
        },
      });
    }
  }

  // Extract medications
  for (const pattern of MEDICATION_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const [, name, dose, unit, frequency] = match;
      if (name && dose) {
        fields.push({
          id: `${chunk.id}-med-${fields.length}`,
          category: 'medication',
          label: name,
          value: `${dose} ${unit}${frequency ? ` ${frequency.trim()}` : ''}`,
          confidence: Math.min(0.7 + baseConf, 0.95),
          sourceChunkId: chunk.id,
          metadata: { dose, unit, frequency: frequency?.trim() },
        });
      }
    }
  }

  // Extract temporal information
  for (const temporal of TEMPORAL_PATTERNS) {
    for (const match of text.matchAll(temporal.pattern)) {
      fields.push({
        id: `${chunk.id}-temporal-${fields.length}`,
        category: 'temporal',
        label: temporal.label,
        value: match[0].trim(),
        confidence: Math.min(0.65 + baseConf, 0.95),
        sourceChunkId: chunk.id,
      });
    }
  }

  // Extract providers
  for (const pattern of PROVIDER_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match[1] && match[1].length > 2) {
        fields.push({
          id: `${chunk.id}-provider-${fields.length}`,
          category: 'provider',
          label: 'Provider',
          value: match[1].trim(),
          confidence: Math.min(0.6 + baseConf, 0.95),
          sourceChunkId: chunk.id,
        });
      }
    }
  }

  // Extract social history
  for (const sh of SOCIAL_HISTORY_PATTERNS) {
    for (const match of text.matchAll(sh.pattern)) {
      fields.push({
        id: `${chunk.id}-sh-${sh.label}-${fields.length}`,
        category: 'social_history',
        label: sh.label,
        value: match[0].trim(),
        confidence: Math.min(0.65 + baseConf, 0.95),
        sourceChunkId: chunk.id,
      });
    }
  }

  // Extract family history
  for (const fh of FAMILY_HISTORY_PATTERNS) {
    for (const match of text.matchAll(fh.pattern)) {
      if (match[1] && match[1].trim().length > 2) {
        fields.push({
          id: `${chunk.id}-fh-${fh.label}-${fields.length}`,
          category: 'family_history',
          label: fh.label,
          value: match[1].trim().slice(0, 100),
          confidence: Math.min(0.6 + baseConf, 0.95),
          sourceChunkId: chunk.id,
        });
      }
    }
  }

  // Extract diagnoses (enhanced)
  const diagnosisPatterns = [
    /\b(?:dx|diagnosis|impression|assessment)[:\s]*([^\n]+)/gi,
    /\b(\d+\.)\s*([A-Z][^\n]+)/g, // Numbered problem list
  ];

  for (const pattern of diagnosisPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = (match[2] || match[1]).trim();
      if (value.length > 3 && value.length < 200) {
        fields.push({
          id: `${chunk.id}-dx-${fields.length}`,
          category: 'diagnosis',
          label: 'Diagnosis',
          value: value.slice(0, 120),
          confidence: Math.min(0.68 + baseConf, 0.95),
          sourceChunkId: chunk.id,
        });
      }
    }
  }

  // Extract procedures
  const procedureMatch = text.match(/\b(?:procedure(?:s)?|performed|intervention)[:\s]*([^\n]+)/i);
  if (procedureMatch && procedureMatch[1].length > 3) {
    fields.push({
      id: `${chunk.id}-proc`,
      category: 'procedure',
      label: 'Procedure',
      value: procedureMatch[1].trim().slice(0, 120),
      confidence: Math.min(0.65 + baseConf, 0.95),
      sourceChunkId: chunk.id,
    });
  }

  // Extract allergies (enhanced)
  const allergyPatterns = [
    /\b(?:allerg(?:y|ies)|NKDA|no known drug allergies|NKA)[:\s]*([^\n]+)?/gi,
    /\b(?:allergic to|adverse reaction to)[:\s]*([^\n,]+)/gi,
  ];

  for (const pattern of allergyPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1]?.trim() || match[0].trim();
      if (value.length > 2) {
        fields.push({
          id: `${chunk.id}-allergy-${fields.length}`,
          category: 'allergy',
          label: 'Allergies',
          value: value.slice(0, 100),
          confidence: Math.min(0.82 + baseConf, 0.95),
          sourceChunkId: chunk.id,
        });
      }
    }
  }

  // Extract dates/times
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?)\b/g,
    /\b(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?)\b/g,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4})\b/gi,
  ];

  for (const pattern of datePatterns) {
    for (const match of text.matchAll(pattern)) {
      fields.push({
        id: `${chunk.id}-date-${fields.length}`,
        category: 'date_time',
        label: 'Date',
        value: match[1],
        confidence: Math.min(0.7 + baseConf, 0.95),
        sourceChunkId: chunk.id,
      });
    }
  }

  // Extract key-value pairs (generic)
  const keyValueMatches = text.matchAll(/([A-Za-z][A-Za-z\s\/]+):\s*([^\n:]+?)(?=\n|[A-Z][a-z]+:|$)/g);
  for (const match of keyValueMatches) {
    const label = match[1].trim();
    const value = match[2].trim();

    // Skip if already extracted as a more specific category
    if (label.length >= 2 && label.length <= 40 && value.length >= 2 && value.length <= 200) {
      const isDuplicate = fields.some(f =>
        f.value.toLowerCase().includes(value.toLowerCase().slice(0, 20)) ||
        value.toLowerCase().includes(f.value.toLowerCase().slice(0, 20))
      );

      if (!isDuplicate) {
        fields.push({
          id: `${chunk.id}-kv-${fields.length}`,
          category: 'key_value',
          label,
          value: value.slice(0, 120),
          confidence: Math.min(0.55 + baseConf, 0.95),
          sourceChunkId: chunk.id,
        });
      }
    }
  }

  return fields;
}

/**
 * Check if a lab value is abnormal based on reference range
 */
function checkAbnormal(value: number, rangeStr: string): boolean | null {
  if (!rangeStr) return null;

  // Handle "<X" format
  if (rangeStr.startsWith('<')) {
    const max = parseFloat(rangeStr.slice(1));
    return value >= max;
  }

  // Handle ">X" format
  if (rangeStr.startsWith('>')) {
    const min = parseFloat(rangeStr.slice(1));
    return value <= min;
  }

  // Handle "X-Y" format
  const parts = rangeStr.split('-').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return value < parts[0] || value > parts[1];
  }

  return null;
}

/**
 * Deduplicate extracted fields
 */
export function dedupeExtractedFields(fields: ExtractedField[]): ExtractedField[] {
  const deduped = new Map<string, ExtractedField>();

  for (const field of fields) {
    const normalizedLabel = field.label.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedValue = field.value.toLowerCase().trim().replace(/\s+/g, ' ');
    const key = `${field.category}::${normalizedLabel}::${normalizedValue}`;

    const existing = deduped.get(key);
    if (!existing || field.confidence > existing.confidence) {
      deduped.set(key, field);
    }
  }

  return Array.from(deduped.values());
}

/**
 * Group extracted fields by category
 */
export function groupFieldsByCategory(fields: ExtractedField[]): Record<ExtractedFieldCategory, ExtractedField[]> {
  const grouped: Record<string, ExtractedField[]> = {};

  for (const field of fields) {
    if (!grouped[field.category]) {
      grouped[field.category] = [];
    }
    grouped[field.category].push(field);
  }

  return grouped as Record<ExtractedFieldCategory, ExtractedField[]>;
}

/**
 * Get abnormal lab values
 */
export function getAbnormalLabs(fields: ExtractedField[]): ExtractedField[] {
  return fields.filter(f =>
    f.category === 'lab_value' &&
    f.metadata?.isAbnormal === true
  );
}

/**
 * Extract structured medication list
 */
export function getMedicationList(fields: ExtractedField[]): Array<{
  name: string;
  dose: string;
  unit: string;
  frequency?: string;
}> {
  return fields
    .filter(f => f.category === 'medication')
    .map(f => ({
      name: f.label,
      dose: f.metadata?.dose || '',
      unit: f.metadata?.unit || '',
      frequency: f.metadata?.frequency,
    }));
}
