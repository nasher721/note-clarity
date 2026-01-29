import { DocumentChunk, PrimaryLabel, RemoveReason, CondenseStrategy } from '@/types/clinical';

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

export const getHeuristicLabel = (
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
