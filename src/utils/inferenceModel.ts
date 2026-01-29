
import { ChunkAnnotation, CondenseStrategy, DocumentChunk, PrimaryLabel, RemoveReason } from '@/types/clinical';
import { findDuplicates } from '@/utils/chunkParser';
import { SemanticSearchService } from '@/services/semanticSearchService';
import {
  extractFieldsFromChunk as extractFieldsEnhanced,
  dedupeExtractedFields as dedupeFieldsEnhanced,
  ExtractedField,
  ExtractedFieldCategory,
} from '@/utils/clinicalExtraction';

// Re-export for backward compatibility
export type { ExtractedField, ExtractedFieldCategory };

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
  /within normal limits/i,
  /unremarkable/i,
  /negative for/i,
];

const ADMINISTRATIVE_PATTERNS = [
  /discharge instructions/i,
  /follow up with/i,
  /appointment scheduled/i,
  /contact information/i,
  /return precautions/i,
  /if symptoms worsen/i,
  /call your doctor if/i,
  /patient education/i,
];

const BOILERPLATE_PATTERNS = [
  /I have personally seen and examined the patient/i,
  /I was present for the key portions/i,
  /I agree with the resident's assessment/i,
  /The above note was reviewed and edited/i,
  /electronically signed by/i,
  /This note was generated/i,
  /attestation/i,
  /time spent on discharge/i,
  /total face-to-face time/i,
  /more than \d+ minutes/i,
];

export type ModelSource =
  | 'learned_exact'
  | 'learned_similar'
  | 'pattern_rule'
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

export interface PatternRule {
  id: string;
  patternType: 'regex' | 'keyword' | 'ngram' | 'semantic';
  patternValue: string;
  label: PrimaryLabel;
  removeReason?: RemoveReason;
  condenseStrategy?: CondenseStrategy;
  chunkType?: string;
  scope: string;
  effectivenessScore: number;
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

/**
 * Configuration for inference model behavior
 */
export interface InferenceConfig {
  semanticThreshold: number;
  jaccardThreshold: number;
  minConfidenceThreshold: number;
  enablePatternRules: boolean;
  enableSemanticSearch: boolean;
  confidenceCalibration: 'none' | 'conservative' | 'aggressive';
}

const DEFAULT_CONFIG: InferenceConfig = {
  semanticThreshold: 0.75,
  jaccardThreshold: 0.5,
  minConfidenceThreshold: 0.6,
  enablePatternRules: true,
  enableSemanticSearch: true,
  confidenceCalibration: 'none',
};

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

/**
 * Apply confidence calibration based on configuration
 */
const calibrateConfidence = (confidence: number, config: InferenceConfig): number => {
  if (config.confidenceCalibration === 'conservative') {
    // Reduce confidence for borderline predictions
    if (confidence < 0.85) {
      return confidence * 0.9;
    }
    return confidence;
  }
  if (config.confidenceCalibration === 'aggressive') {
    // Boost confidence for high-confidence predictions
    if (confidence > 0.7) {
      return Math.min(confidence * 1.1, 0.98);
    }
    return confidence;
  }
  return confidence;
};

/**
 * Match chunk against pattern rules
 */
const matchPatternRules = (
  chunk: DocumentChunk,
  patternRules: PatternRule[],
): MatchResult | null => {
  if (!patternRules || patternRules.length === 0) return null;

  const normalizedText = normalizeText(chunk.text);

  for (const rule of patternRules) {
    let matched = false;

    switch (rule.patternType) {
      case 'keyword':
        matched = normalizedText.includes(rule.patternValue.toLowerCase());
        break;

      case 'ngram':
        matched = normalizedText.includes(rule.patternValue.toLowerCase());
        break;

      case 'regex':
        try {
          const regex = new RegExp(rule.patternValue, 'i');
          matched = regex.test(chunk.text);
        } catch {
          // Invalid regex, skip
        }
        break;
    }

    if (matched && (!rule.chunkType || rule.chunkType === chunk.type)) {
      const confidence = Math.min(0.7 + rule.effectivenessScore * 0.25, 0.92);

      const annotation: ChunkAnnotation = {
        chunkId: chunk.id,
        rawText: chunk.text,
        sectionType: chunk.type,
        label: rule.label,
        removeReason: rule.removeReason,
        condenseStrategy: rule.condenseStrategy,
        scope: rule.scope as ChunkAnnotation['scope'],
        timestamp: new Date(),
        userId: 'system',
      };

      return {
        annotation,
        explanation: {
          source: 'pattern_rule',
          confidence,
          reason: `Matched ${rule.patternType} pattern: "${rule.patternValue.slice(0, 30)}..."`,
          signals: [`Pattern type: ${rule.patternType}`, `Effectiveness: ${Math.round(rule.effectivenessScore * 100)}%`],
        },
      };
    }
  }

  return null;
};

const getSimilarityMatch = async (
  chunk: DocumentChunk,
  learnedAnnotations: ChunkAnnotation[],
  noteType?: string,
  service?: string,
  config: InferenceConfig = DEFAULT_CONFIG,
) => {
  const normalizedChunk = normalizeText(chunk.text);

  // 1. Exact match first (cheapest)
  for (const annotation of learnedAnnotations) {
    if (normalizeText(annotation.rawText) === normalizedChunk) {
      return { annotation, score: 1 };
    }
  }

  // 2. Semantic Search (Most accurate, expensive)
  if (config.enableSemanticSearch) {
    try {
      await SemanticSearchService.getModel(); // Check if loaded
      const texts = [chunk.text, ...learnedAnnotations.map(a => a.rawText)];
      const embeddings = await SemanticSearchService.embed(texts);

      const chunkEmbedding = embeddings[0];
      const ruleEmbeddings = embeddings.slice(1);

      let bestSemMatch: { annotation: ChunkAnnotation; score: number } | null = null;

      ruleEmbeddings.forEach((embedding, i) => {
        const score = SemanticSearchService.cosineSimilarity(chunkEmbedding, embedding);
        if (score > config.semanticThreshold) {
          const annotation = learnedAnnotations[i];
          const weighted = score * scopeWeight(annotation.scope, noteType, service);
          if (!bestSemMatch || weighted > bestSemMatch.score) {
            bestSemMatch = { annotation, score: weighted };
          }
        }
      });

      if (bestSemMatch) return bestSemMatch;
    } catch {
      // Fallback if model failed or not loaded
    }
  }

  // 3. Jaccard Index (Fallback)
  let bestMatch: { annotation: ChunkAnnotation; score: number } | null = null;
  for (const annotation of learnedAnnotations) {
    const similarity = jaccardSimilarity(chunk.text, annotation.rawText);
    if (similarity < config.jaccardThreshold) continue;

    const weighted = similarity * scopeWeight(annotation.scope, noteType, service);
    if (!bestMatch || weighted > bestMatch.score) {
      bestMatch = { annotation, score: weighted };
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
      reason: `Critical clinical indicator: ${chunk.criticalType || 'detected'}`,
    };
  }

  if (chunk.type === 'section_header') {
    return {
      label: 'KEEP',
      confidence: 0.9,
      reason: 'Section headers preserved for structure',
    };
  }

  if (chunk.type === 'attestation') {
    return {
      label: 'REMOVE',
      removeReason: 'billing_attestation',
      confidence: 0.85,
      reason: 'Attestation/billing statement',
    };
  }

  // Check for boilerplate patterns
  if (BOILERPLATE_PATTERNS.some(pattern => pattern.test(chunk.text))) {
    return {
      label: 'REMOVE',
      removeReason: 'boilerplate_template',
      confidence: 0.8,
      reason: 'Boilerplate template text',
    };
  }

  if (NORMAL_EXAM_PATTERNS.some(pattern => pattern.test(chunk.text))) {
    return {
      label: 'REMOVE',
      removeReason: 'normal_ros_exam',
      confidence: 0.78,
      reason: 'Normal ROS/exam findings (non-contributory)',
    };
  }

  if (ADMINISTRATIVE_PATTERNS.some(pattern => pattern.test(chunk.text))) {
    return {
      label: 'REMOVE',
      removeReason: 'administrative_text',
      confidence: 0.72,
      reason: 'Administrative/non-clinical text',
    };
  }

  if (/copy forward|copied from prior|copied prior note|see previous note/i.test(chunk.text)) {
    return {
      label: 'REMOVE',
      removeReason: 'copied_prior_note',
      confidence: 0.76,
      reason: 'Explicitly copied from prior note',
    };
  }

  if (/unchanged from prior|no interval change|stable compared to|no significant change/i.test(chunk.text)) {
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
        reason: 'Lab results repeated without significant change',
      };
    }
  }

  // Condense strategies
  if (chunk.type === 'lab_values' && chunk.text.length > 250) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'abnormal_only',
      confidence: 0.7,
      reason: 'Dense lab section - show abnormals only',
    };
  }

  if (chunk.type === 'imaging_report' && chunk.text.length > 280) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'one_line_summary',
      confidence: 0.68,
      reason: 'Long imaging narrative - summarize findings',
    };
  }

  if (chunk.type === 'medication_list' && chunk.text.split('\n').length > 8) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'one_line_summary',
      confidence: 0.64,
      reason: 'Long medication list - highlight changes',
    };
  }

  if (chunk.type === 'paragraph' && chunk.text.length > 450) {
    return {
      label: 'CONDENSE',
      condenseStrategy: 'problem_based_summary',
      confidence: 0.62,
      reason: 'Extended narrative - problem-based summary',
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
      confidence: 0.78,
      reason: 'Duplicate text detected in note',
      signals: ['Content appears earlier in document'],
    },
  };
};

const getLearnedSuggestion = async (
  chunk: DocumentChunk,
  learnedAnnotations: ChunkAnnotation[],
  noteType?: string,
  service?: string,
  config: InferenceConfig = DEFAULT_CONFIG,
): Promise<MatchResult | null> => {
  if (!learnedAnnotations.length) return null;

  const match = await getSimilarityMatch(chunk, learnedAnnotations, noteType, service, config);
  if (!match) return null;

  if (match.score < 0.7) return null;

  const annotation = buildAnnotation(chunk, match.annotation.label, {
    removeReason: match.annotation.removeReason,
    condenseStrategy: match.annotation.condenseStrategy,
    scope: match.annotation.scope,
  });

  const isExact = match.score >= 0.95;

  return {
    annotation,
    explanation: {
      source: isExact ? 'learned_exact' : 'learned_similar',
      confidence: Math.min(match.score, 0.95),
      reason: isExact ? 'Exact match to learned rule' : 'Similar to learned rule',
      signals: [
        `Scope: ${match.annotation.scope.replace(/_/g, ' ')}`,
        `Similarity: ${Math.round(match.score * 100)}%`,
      ],
    },
  };
};

const buildCandidateSignals = (
  chunk: DocumentChunk,
  patternRules?: PatternRule[],
): CandidateSignal[] => {
  const signals: CandidateSignal[] = [];

  // Check pattern rules first
  if (patternRules) {
    const patternMatch = matchPatternRules(chunk, patternRules);
    if (patternMatch) {
      signals.push({
        label: patternMatch.annotation.label,
        confidence: patternMatch.explanation.confidence,
        reason: patternMatch.explanation.reason || 'Pattern rule match',
        source: 'pattern_rule',
        removeReason: patternMatch.annotation.removeReason,
        condenseStrategy: patternMatch.annotation.condenseStrategy,
      });
    }
  }

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

const mergeSignals = (signals: CandidateSignal[], config: InferenceConfig = DEFAULT_CONFIG) => {
  if (!signals.length) return null;

  const grouped = new Map<PrimaryLabel, CandidateSignal[]>();
  for (const signal of signals) {
    const existing = grouped.get(signal.label) ?? [];
    existing.push(signal);
    grouped.set(signal.label, existing);
  }

  const ranked = Array.from(grouped.entries()).map(([label, items]) => {
    const avgConfidence = items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
    // Boost confidence when multiple signals agree
    const boost = Math.min(items.length * 0.05, 0.12);
    const boosted = Math.min(avgConfidence + boost, 0.97);

    return {
      label,
      confidence: calibrateConfidence(boosted, config),
      reasons: items.map(item => item.reason),
      sources: items.map(item => item.source),
      removeReason: items.find(item => item.removeReason)?.removeReason,
      condenseStrategy: items.find(item => item.condenseStrategy)?.condenseStrategy,
    };
  });

  ranked.sort((a, b) => b.confidence - a.confidence);

  // Only return if above minimum threshold
  const best = ranked[0];
  if (best && best.confidence >= config.minConfidenceThreshold) {
    return best;
  }

  return null;
};

const applyCriticalSafety = (chunk: DocumentChunk, candidate: CandidateSignal) => {
  if (!chunk.isCritical || candidate.label !== 'REMOVE') return candidate;

  return {
    ...candidate,
    label: 'KEEP' as PrimaryLabel,
    confidence: Math.max(candidate.confidence - 0.15, 0.6),
    reason: `Critical content retained (${chunk.criticalType || 'clinical indicator'})`,
    source: 'critical_safety' as ModelSource,
    removeReason: undefined,
  };
};

/**
 * Build model annotations for a document
 */
export const buildModelAnnotations = async ({
  chunks,
  learnedAnnotations,
  noteType,
  service,
  patternRules,
  config = DEFAULT_CONFIG,
}: {
  chunks: DocumentChunk[];
  learnedAnnotations: ChunkAnnotation[];
  noteType?: string;
  service?: string;
  patternRules?: PatternRule[];
  config?: InferenceConfig;
}) => {
  const annotations: ChunkAnnotation[] = [];
  const explanations: Record<string, ModelExplanation> = {};
  const extractedFields: ExtractedField[] = [];

  const duplicates = findDuplicates(chunks);

  for (const chunk of chunks) {
    // Use enhanced field extraction
    extractedFields.push(...extractFieldsEnhanced(chunk));

    // 1. Check learned rules first (highest priority)
    const learned = await getLearnedSuggestion(chunk, learnedAnnotations, noteType, service, config);
    if (learned) {
      annotations.push(learned.annotation);
      explanations[chunk.id] = learned.explanation;
      continue;
    }

    // 2. Check pattern rules
    if (config.enablePatternRules && patternRules) {
      const patternMatch = matchPatternRules(chunk, patternRules);
      if (patternMatch && patternMatch.explanation.confidence >= config.minConfidenceThreshold) {
        annotations.push(patternMatch.annotation);
        explanations[chunk.id] = patternMatch.explanation;
        continue;
      }
    }

    // 3. Check duplicates
    const duplicateSuggestion = getDuplicateSuggestion(chunk, duplicates);
    if (duplicateSuggestion) {
      annotations.push(duplicateSuggestion.annotation);
      explanations[chunk.id] = duplicateSuggestion.explanation;
      continue;
    }

    // 4. Build candidate signals from heuristics
    const candidates = buildCandidateSignals(chunk, patternRules);
    const merged = mergeSignals(candidates, config);

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

  return {
    annotations,
    explanations,
    extractedFields: dedupeFieldsEnhanced(extractedFields),
  };
};

/**
 * Quick inference without semantic search (faster)
 */
export const buildModelAnnotationsQuick = async (params: {
  chunks: DocumentChunk[];
  learnedAnnotations: ChunkAnnotation[];
  noteType?: string;
  service?: string;
  patternRules?: PatternRule[];
}) => {
  return buildModelAnnotations({
    ...params,
    config: {
      ...DEFAULT_CONFIG,
      enableSemanticSearch: false,
    },
  });
};

/**
 * Get inference statistics
 */
export const getInferenceStats = (
  annotations: ChunkAnnotation[],
  explanations: Record<string, ModelExplanation>
) => {
  const sources = Object.values(explanations).map(e => e.source);
  const confidences = Object.values(explanations).map(e => e.confidence);

  const sourceDistribution: Record<ModelSource, number> = {
    learned_exact: 0,
    learned_similar: 0,
    pattern_rule: 0,
    duplicate_detector: 0,
    heuristic_rules: 0,
    critical_safety: 0,
    combined_signals: 0,
  };

  for (const source of sources) {
    sourceDistribution[source]++;
  }

  const labelDistribution: Record<PrimaryLabel, number> = {
    KEEP: 0,
    CONDENSE: 0,
    REMOVE: 0,
  };

  for (const annotation of annotations) {
    labelDistribution[annotation.label]++;
  }

  return {
    totalChunks: annotations.length,
    avgConfidence: confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0,
    sourceDistribution,
    labelDistribution,
  };
};
