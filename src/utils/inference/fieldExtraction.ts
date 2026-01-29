import { DocumentChunk } from '@/types/clinical';
import { ExtractedField } from './types';
import { normalizeFieldText } from './textUtils';

const boostByChunkType = (chunk: DocumentChunk, base: number) => {
    const boost = chunk.type === 'section_header' ? 0.1 : chunk.isCritical ? 0.08 : 0;
    return Math.min(base + boost, 0.95);
};

/**
 * Extracts structured fields (meds, vitals, labs, etc.) from a document chunk
 */
export const extractFieldsFromChunk = (chunk: DocumentChunk): ExtractedField[] => {
    const fields: ExtractedField[] = [];
    const base = {
        sourceChunkId: chunk.id,
    };

    // Key-Value pairs
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

    // Vitals
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

    // Labs
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

    // Medications
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

    // Diagnosis
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

    // Procedures
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

    // Allergies
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

    // Problem List
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

    // Date
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

/**
 * Deduplicates extracted fields based on normalized content
 */
export const dedupeExtractedFields = (fields: ExtractedField[]) => {
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
