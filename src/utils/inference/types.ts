import { ChunkAnnotation, CondenseStrategy, PrimaryLabel, RemoveReason } from '@/types/clinical';

export type ModelSource =
    | 'learned_exact'
    | 'learned_similar'
    | 'pattern_rule'
    | 'duplicate_detector'
    | 'heuristic_rules'
    | 'critical_safety'
    | 'combined_signals';

export interface PatternRule {
    id: string;
    pattern: string;
    label: PrimaryLabel;
    confidence: number;
    description?: string;
}

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

export interface MatchResult {
    annotation: ChunkAnnotation;
    explanation: ModelExplanation;
}

export interface CandidateSignal {
    label: PrimaryLabel;
    confidence: number;
    reason: string;
    source: ModelSource;
    removeReason?: RemoveReason;
    condenseStrategy?: CondenseStrategy;
}
