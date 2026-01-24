import { ChunkAnnotation, CondenseStrategy, DocumentChunk, PrimaryLabel, RemoveReason } from '@/types/clinical';
import { findDuplicates } from '@/utils/chunkParser';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'with',
]);

const NORMALIZED_PUNCTUATION = /[^a-z0-9\s]/g;
const MULTISPACE = /\s+/g;

const NORMAL_EXAM_PATTERNS = [
  /all other systems (reviewed|negative)/i,
  /review of systems.*negative/i,
  /normal (ros|review of systems)/i,
  /normal (physical exam|exam)/i,
  /no acute distress/i,
  /nad\b/i,
];

const ADMINISTRATIVE_PATTERNS = [
  /discharge instructions/i,
  /follow up with/i,
  /appointment scheduled/i,
  /contact information/i,
];

export type ModelSource =
  | 'learned_exact'
  | 'learned_similar'
  | 'duplicate_detector'
  | 'heuristic_rules'
  | 'critical_safety'
  | 'combined_signals';

export interface ModelExplanation {
  source: ModelSource;
  confidence: number;
  reason?: string;
  signals?: string[];
}

export type ExtractedFieldCategory =
  | 'vital_signs'
  | 'lab_value'
  | 'medication'
  | 'diagnosis'
  | 'procedure'
  | 'date_time'
  | 'key_value'
  | 'allergy'
  | 'problem';

export interface ExtractedField {
  id: string;
  category: ExtractedFieldCategory;
  label: string;
  value: string;
  confidence: number;
  sourceChunkId: string;
}

interface MatchResult {
  annotation: ChunkAnnotation;
  explanation: ModelExplanation;
}

interface CandidateSignal {
  label: PrimaryLabel;
  confidence: number;
  reason: string;
  source: ModelSource;
  removeReason?: RemoveReason;
  condenseStrategy?: CondenseStrategy;
}

const normalizeText = (text: string) =>
  text.toLowerCase().replace(NORMALIZED_PUNCTUATION, ' ').replace(MULTISPACE, ' ').trim();

const tokenize = (text: string) =>
  normalizeText(text)
    .split(' ')
    .filter(token => token.length > 2 && !STOPWORDS.has(token));

const jaccardSimilarity = (a: string, b: string) => {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }
  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

const scopeWeight = (scope: ChunkAnnotation['scope'], noteType?: string, service?: string) => {
  if (scope === 'note_type') return noteType ? 0.95 : 0.75;
  if (scope === 'service') return service ? 0.9 : 0.7;
  if (scope === 'global') return 0.85;
  return 0.8;
};

const getSimilarityMatch = (
  chunk: DocumentChunk,
  learnedAnnotations: ChunkAnnotation[],
  noteType?: string,
  service?: string,
) => {
  const normalizedChunk = normalizeText(chunk.text);
  let bestMatch: { annotation: ChunkAnnotation; score: number } | null = null;

  for (const annotation of learnedAnnotations) {
    const normalizedAnnotation = normalizeText(annotation.rawText);
    const exactMatch = normalizedAnnotation === normalizedChunk;
    if (exactMatch) {
      return { annotation, score: 1 };
    }

    const similarity = jaccardSimilarity(chunk.text, annotation.rawText);
    if (similarity < 0.5) continue;

    const typeBoost = annotation.sectionType === chunk.type ? 0.1 : 0;
    const weighted = similarity + typeBoost;
    const score = Math.min(weighted * scopeWeight(annotation.scope, noteType, service), 1);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { annotation, score };
    }
  }

  return bestMatch;
};

const getHeuristicLabel = (
  chunk: DocumentChunk,
): { label?: PrimaryLabel; removeReason?: RemoveReason; condenseStrategy?: CondenseStrategy; confidence?: number; reason?: string } => {
  if (chunk.isCritical) {
    return {
      label: 'KEEP',
      confidence: 0.95,
      reason: 'Critical clinical indicator detected',
    };
  }

  if (chunk.type === 'section_header') {
    return {
      label: 'KEEP',
      confidence: 0.9,
      reason: 'Section headers preserved',
    };
  }

  if (chunk.type === 'attestation') {
    return {
      label: 'REMOVE',
      removeReason: 'billing_attestation',
      confidence: 0.82,
      reason: 'Attestation statement',
    };
  }

  if (NORMAL_EXAM_PATTERNS.some(pattern => pattern.test(chunk.text))) {
    return {
      label: 'REMOVE',
      removeReason: 'normal_ros_exam',
      confidence: 0.78,
      reason: 'Normal ROS/exam boilerplate',
    };
  }

  if (ADMINISTRATIVE_PATTERNS.some(pattern => pattern.test(chunk.text))) {
    return {
      label: 'REMOVE',
      removeReason: 'administrative_text',
      confidence: 0.72,
      reason: 'Administrative follow-up language',
    };
  }

  if (/copy forward|copied from prior|copied prior note/i.test(chunk.text)) {
    return {
      label: 'REMOVE',
      removeReason: 'copied_prior_note',
      confidence: 0.76,
      reason: 'Explicitly copied from prior note',
    };
  }

  if (/unchanged from prior|no interval change|stable compared to/i.test(chunk.text)) {
    if (chunk.type === 'imaging_report') {
      return {
        label: 'REMOVE',
        removeReason: 'repeated_imaging',
        confidence: 0.74,
        reason: 'Imaging repeated without interval change',
      };
    }
    if (chunk.type === 'lab_values') {
      return {
        label: 'REMOVE',
        removeReason: 'repeated_labs',
        confidence: 0.72,
        reason: 'Lab results repeated without change',
      };
    }
  }

  if (chunk.type === 'lab_values' && chunk.text.length > 250) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'abnormal_only',
      confidence: 0.7,
      reason: 'Dense lab section',
    };
  }

  if (chunk.type === 'imaging_report' && chunk.text.length > 280) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'one_line_summary',
      confidence: 0.68,
      reason: 'Long imaging narrative',
    };
  }

  if (chunk.type === 'medication_list' && chunk.text.split('\n').length > 8) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'one_line_summary',
      confidence: 0.64,
      reason: 'Long medication list',
    };
  }

  if (chunk.type === 'paragraph' && chunk.text.length > 450) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'problem_based_summary',
      confidence: 0.62,
      reason: 'Extended narrative section',
    };
  }

  if (chunk.suggestedLabel && chunk.confidence) {
    return {
      label: chunk.suggestedLabel,
      confidence: Math.min(chunk.confidence + 0.05, 0.95),
      reason: 'Parser rule match',
    };
  }

  return {};
};

const buildAnnotation = (
  chunk: DocumentChunk,
  label: PrimaryLabel,
  options: {
    removeReason?: RemoveReason;
    condenseStrategy?: CondenseStrategy;
    scope?: ChunkAnnotation['scope'];
  },
): ChunkAnnotation => ({
  chunkId: chunk.id,
  rawText: chunk.text,
  sectionType: chunk.type,
  label,
  removeReason: options.removeReason,
  condenseStrategy: options.condenseStrategy,
  scope: options.scope ?? 'this_document',
  timestamp: new Date(),
  userId: 'system',
});

const getDuplicateSuggestion = (chunk: DocumentChunk, duplicates: Set<string>): MatchResult | null => {
  if (!duplicates.has(chunk.id)) return null;

  const annotation = buildAnnotation(chunk, 'REMOVE', {
    removeReason: 'duplicate_data',
    scope: 'this_document',
  });

  return {
    annotation,
    explanation: {
      source: 'duplicate_detector',
      confidence: 0.74,
      reason: 'Repeated text detected in note',
      signals: ['Text overlaps earlier section'],
    },
  };
};

const getLearnedSuggestion = (
  chunk: DocumentChunk,
  learnedAnnotations: ChunkAnnotation[],
  noteType?: string,
  service?: string,
): MatchResult | null => {
  if (!learnedAnnotations.length) return null;

  const match = getSimilarityMatch(chunk, learnedAnnotations, noteType, service);
  if (!match) return null;

  if (match.score < 0.7) return null;

  const annotation = buildAnnotation(chunk, match.annotation.label, {
    removeReason: match.annotation.removeReason,
    condenseStrategy: match.annotation.condenseStrategy,
    scope: match.annotation.scope,
  });

  return {
    annotation,
    explanation: {
      source: match.score >= 0.95 ? 'learned_exact' : 'learned_similar',
      confidence: Math.min(match.score, 0.95),
      reason: match.score >= 0.95 ? 'Exact match to learned rule' : 'Similar wording to learned rule',
      signals: [
        `Scope: ${match.annotation.scope.replace(/_/g, ' ')}`,
        `Similarity: ${Math.round(match.score * 100)}%`,
      ],
    },
  };
};

const buildCandidateSignals = (chunk: DocumentChunk): CandidateSignal[] => {
  const signals: CandidateSignal[] = [];
  const heuristic = getHeuristicLabel(chunk);
  if (heuristic.label && heuristic.confidence && heuristic.reason) {
    signals.push({
      label: heuristic.label,
      confidence: heuristic.confidence,
      reason: heuristic.reason,
      source: chunk.isCritical ? 'critical_safety' : 'heuristic_rules',
      removeReason: heuristic.removeReason,
      condenseStrategy: heuristic.condenseStrategy,
    });
  }

  if (chunk.suggestedLabel && chunk.confidence) {
    signals.push({
      label: chunk.suggestedLabel,
      confidence: Math.min(chunk.confidence + 0.04, 0.9),
      reason: 'Parser suggestion',
      source: 'heuristic_rules',
    });
  }

  return signals;
};

const mergeSignals = (signals: CandidateSignal[]) => {
  if (!signals.length) return null;

  const grouped = new Map<PrimaryLabel, CandidateSignal[]>();
  for (const signal of signals) {
    const existing = grouped.get(signal.label) ?? [];
    existing.push(signal);
    grouped.set(signal.label, existing);
  }

  const ranked = Array.from(grouped.entries()).map(([label, items]) => {
    const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
    const boosted = Math.min(avgConfidence + Math.min(items.length * 0.05, 0.12), 0.97);
    return {
      label,
      confidence: boosted,
      reasons: items.map(item => item.reason),
      sources: items.map(item => item.source),
      removeReason: items.find(item => item.removeReason)?.removeReason,
      condenseStrategy: items.find(item => item.condenseStrategy)?.condenseStrategy,
    };
  });

  ranked.sort((a, b) => b.confidence - a.confidence);
  return ranked[0];
};

const applyCriticalSafety = (chunk: DocumentChunk, candidate: CandidateSignal) => {
  if (!chunk.isCritical || candidate.label !== 'REMOVE') return candidate;

  return {
    ...candidate,
    label: 'KEEP' as PrimaryLabel,
    confidence: Math.max(candidate.confidence - 0.15, 0.6),
    reason: 'Critical content retained despite removal signal',
    source: 'critical_safety' as ModelSource,
    removeReason: undefined,
  };
};

const normalizeFieldText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const boostByChunkType = (chunk: DocumentChunk, base: number) => {
  const boost = chunk.type === 'section_header' ? 0.1 : chunk.isCritical ? 0.08 : 0;
  return Math.min(base + boost, 0.95);
};

const extractFieldsFromChunk = (chunk: DocumentChunk): ExtractedField[] => {
  const fields: ExtractedField[] = [];
  const base = {
    sourceChunkId: chunk.id,
  };

  const keyValueMatches = chunk.text.matchAll(/([A-Za-z][A-Za-z\s\/]+):\s*([^\n]+)/g);
  for (const match of keyValueMatches) {
    const label = match[1].trim().slice(0, 40);
    const value = match[2].trim().slice(0, 120);
    if (label.length < 2 || value.length < 2) continue;
    fields.push({
      ...base,
      id: `${chunk.id}-kv-${fields.length}`,
      category: 'key_value',
      label,
      value,
      confidence: boostByChunkType(chunk, 0.62),
    });
  }

  const vitals = [
    { label: 'BP', pattern: /\bBP[:\s]*([0-9]{2,3}\/[0-9]{2,3})/i },
    { label: 'HR', pattern: /\bHR[:\s]*([0-9]{2,3})/i },
    { label: 'RR', pattern: /\bRR[:\s]*([0-9]{1,2})/i },
    { label: 'Temp', pattern: /\bTemp(?:erature)?[:\s]*([0-9]{2,3}(?:\.[0-9])?\s*[FC]?)/i },
    { label: 'SpO2', pattern: /\bSpO2[:\s]*([0-9]{2,3}%?)/i },
  ];
  for (const vital of vitals) {
    const match = chunk.text.match(vital.pattern);
    if (match) {
      fields.push({
        ...base,
        id: `${chunk.id}-vital-${vital.label}`,
        category: 'vital_signs',
        label: vital.label,
        value: match[1],
        confidence: boostByChunkType(chunk, 0.75),
      });
    }
  }

  const labRegex = /\b(WBC|Hgb|HCT|Plt|Na|K|Cl|CO2|BUN|Cr|Glucose|AST|ALT|Bili)\b[:\s]*([0-9]+(?:\.[0-9]+)?)/gi;
  for (const match of chunk.text.matchAll(labRegex)) {
    fields.push({
      ...base,
      id: `${chunk.id}-lab-${match[1]}-${fields.length}`,
      category: 'lab_value',
      label: match[1],
      value: match[2],
      confidence: boostByChunkType(chunk, 0.68),
    });
  }

  const medRegex = /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s*(mg|mcg|g|units)\b([^.\n]*)/g;
  for (const match of chunk.text.matchAll(medRegex)) {
    const tail = match[4]?.trim();
    fields.push({
      ...base,
      id: `${chunk.id}-med-${fields.length}`,
      category: 'medication',
      label: match[1],
      value: `${match[2]} ${match[3]}${tail ? ` ${tail}` : ''}`.trim(),
      confidence: boostByChunkType(chunk, 0.6),
    });
  }

  const diagnosisMatch = chunk.text.match(/\b(?:dx|diagnosis|impression)[:\s]*([^\n]+)/i);
  if (diagnosisMatch) {
    fields.push({
      ...base,
      id: `${chunk.id}-dx`,
      category: 'diagnosis',
      label: 'Diagnosis',
      value: diagnosisMatch[1].trim().slice(0, 120),
      confidence: boostByChunkType(chunk, 0.58),
    });
  }

  const procedureMatch = chunk.text.match(/\b(?:procedure|performed)[:\s]*([^\n]+)/i);
  if (procedureMatch) {
    fields.push({
      ...base,
      id: `${chunk.id}-proc`,
      category: 'procedure',
      label: 'Procedure',
      value: procedureMatch[1].trim().slice(0, 120),
      confidence: boostByChunkType(chunk, 0.55),
    });
  }

  const allergyMatch = chunk.text.match(/\b(allerg(?:y|ies)|NKDA|no known drug allergies)[:\s]*([^\n]+)/i);
  if (allergyMatch) {
    fields.push({
      ...base,
      id: `${chunk.id}-allergy`,
      category: 'allergy',
      label: 'Allergies',
      value: allergyMatch[2]?.trim() || allergyMatch[1],
      confidence: boostByChunkType(chunk, 0.76),
    });
  }

  const problemMatch = chunk.text.match(/\b(problem list|diagnoses|active problems)[:\s]*([^\n]+)/i);
  if (problemMatch) {
    fields.push({
      ...base,
      id: `${chunk.id}-problem`,
      category: 'problem',
      label: 'Problem List',
      value: problemMatch[2]?.trim() || problemMatch[1],
      confidence: boostByChunkType(chunk, 0.6),
    });
  }

  const dateMatch = chunk.text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?|\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    fields.push({
      ...base,
      id: `${chunk.id}-date`,
      category: 'date_time',
      label: 'Date',
      value: dateMatch[1],
      confidence: boostByChunkType(chunk, 0.57),
    });
  }

  return fields;
};

const dedupeExtractedFields = (fields: ExtractedField[]) => {
  const deduped = new Map<string, ExtractedField>();
  for (const field of fields) {
    const key = `${field.category}::${normalizeFieldText(field.label)}::${normalizeFieldText(field.value)}`;
    const existing = deduped.get(key);
    if (!existing || field.confidence > existing.confidence) {
      deduped.set(key, field);
    }
  }
  return Array.from(deduped.values());
};

export const buildModelAnnotations = ({
  chunks,
  learnedAnnotations,
  noteType,
  service,
}: {
  chunks: DocumentChunk[];
  learnedAnnotations: ChunkAnnotation[];
  noteType?: string;
  service?: string;
}) => {
  const annotations: ChunkAnnotation[] = [];
  const explanations: Record<string, ModelExplanation> = {};
  const extractedFields: ExtractedField[] = [];

  const duplicates = findDuplicates(chunks);

  for (const chunk of chunks) {
    extractedFields.push(...extractFieldsFromChunk(chunk));

    const learned = getLearnedSuggestion(chunk, learnedAnnotations, noteType, service);
    if (learned) {
      annotations.push(learned.annotation);
      explanations[chunk.id] = learned.explanation;
      continue;
    }

    const duplicateSuggestion = getDuplicateSuggestion(chunk, duplicates);
    if (duplicateSuggestion) {
      annotations.push(duplicateSuggestion.annotation);
      explanations[chunk.id] = duplicateSuggestion.explanation;
      continue;
    }

    const candidates = buildCandidateSignals(chunk);
    const merged = mergeSignals(candidates);
    if (merged) {
      const safeCandidate = applyCriticalSafety(chunk, {
        label: merged.label,
        confidence: merged.confidence,
        reason: merged.reasons[0] ?? 'Composite heuristic',
        source: merged.sources.length > 1 ? 'combined_signals' : merged.sources[0],
        removeReason: merged.removeReason,
        condenseStrategy: merged.condenseStrategy,
      });
      const annotation = buildAnnotation(chunk, safeCandidate.label, {
        removeReason: safeCandidate.removeReason,
        condenseStrategy: safeCandidate.condenseStrategy,
      });
      annotations.push(annotation);
      explanations[chunk.id] = {
        source: safeCandidate.source,
        confidence: safeCandidate.confidence,
        reason: safeCandidate.reason,
        signals: merged.reasons.slice(0, 3),
      };
    }
  }

  return { annotations, explanations, extractedFields: dedupeExtractedFields(extractedFields) };
};
