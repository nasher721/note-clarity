import { supabase } from '@/integrations/supabase/client';
import { ChunkAnnotation, PrimaryLabel } from '@/types/clinical';

export type ExportFormat = 'jsonl' | 'csv' | 'huggingface';

export interface TrainingExample {
  id: string;
  text: string;
  label: PrimaryLabel;
  chunkType: string;
  removeReason?: string;
  condenseStrategy?: string;
  noteType?: string;
  service?: string;
  scope: string;
  timestamp: string;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  filterByLabel?: PrimaryLabel[];
  filterByScope?: string[];
  minConfidence?: number;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  recordCount: number;
}

/**
 * Service for exporting training data for external ML pipelines
 */
export class TrainingExportService {
  /**
   * Fetch all annotations for a user
   */
  static async fetchAnnotations(userId: string): Promise<TrainingExample[]> {
    // Fetch from chunk_annotations with joined data
    const { data: annotations, error } = await supabase
      .from('chunk_annotations')
      .select(`
        id,
        chunk_id,
        label,
        remove_reason,
        condense_strategy,
        scope,
        created_at,
        document_chunks!inner(
          text,
          chunk_type,
          clinical_documents!inner(
            note_type,
            service
          )
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return (annotations || []).map((a: any) => ({
      id: a.id,
      text: a.document_chunks?.text || '',
      label: a.label as PrimaryLabel,
      chunkType: a.document_chunks?.chunk_type || 'unknown',
      removeReason: a.remove_reason,
      condenseStrategy: a.condense_strategy,
      noteType: a.document_chunks?.clinical_documents?.note_type,
      service: a.document_chunks?.clinical_documents?.service,
      scope: a.scope,
      timestamp: a.created_at,
    }));
  }

  /**
   * Fetch learned rules for a user
   */
  static async fetchLearnedRules(userId: string): Promise<TrainingExample[]> {
    const { data: rules, error } = await supabase
      .from('learned_rules')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return (rules || []).map(r => ({
      id: r.id,
      text: r.pattern_text,
      label: r.label as PrimaryLabel,
      chunkType: r.chunk_type || 'unknown',
      removeReason: r.remove_reason,
      condenseStrategy: r.condense_strategy,
      noteType: r.note_type,
      service: r.service,
      scope: r.scope,
      timestamp: r.created_at,
    }));
  }

  /**
   * Filter examples based on options
   */
  static filterExamples(examples: TrainingExample[], options: ExportOptions): TrainingExample[] {
    let filtered = examples;

    if (options.filterByLabel && options.filterByLabel.length > 0) {
      filtered = filtered.filter(e => options.filterByLabel!.includes(e.label));
    }

    if (options.filterByScope && options.filterByScope.length > 0) {
      filtered = filtered.filter(e => options.filterByScope!.includes(e.scope));
    }

    return filtered;
  }

  /**
   * Export as JSONL format (one JSON object per line)
   */
  static toJSONL(examples: TrainingExample[], includeMetadata: boolean): string {
    return examples
      .map(e => {
        if (includeMetadata) {
          return JSON.stringify({
            text: e.text,
            label: e.label,
            chunk_type: e.chunkType,
            remove_reason: e.removeReason,
            condense_strategy: e.condenseStrategy,
            note_type: e.noteType,
            service: e.service,
            scope: e.scope,
          });
        }
        return JSON.stringify({
          text: e.text,
          label: e.label,
        });
      })
      .join('\n');
  }

  /**
   * Export as CSV format
   */
  static toCSV(examples: TrainingExample[], includeMetadata: boolean): string {
    const escapeCSV = (value: string | undefined) => {
      if (!value) return '';
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = includeMetadata
      ? ['text', 'label', 'chunk_type', 'remove_reason', 'condense_strategy', 'note_type', 'service', 'scope']
      : ['text', 'label'];

    const rows = examples.map(e => {
      if (includeMetadata) {
        return [
          escapeCSV(e.text),
          e.label,
          e.chunkType,
          escapeCSV(e.removeReason),
          escapeCSV(e.condenseStrategy),
          escapeCSV(e.noteType),
          escapeCSV(e.service),
          e.scope,
        ].join(',');
      }
      return [escapeCSV(e.text), e.label].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export as HuggingFace datasets format
   */
  static toHuggingFace(examples: TrainingExample[], includeMetadata: boolean): string {
    const labelMap: Record<PrimaryLabel, number> = {
      KEEP: 0,
      CONDENSE: 1,
      REMOVE: 2,
    };

    const data = examples.map((e, idx) => ({
      id: idx,
      text: e.text,
      label: labelMap[e.label],
      label_text: e.label,
      ...(includeMetadata && {
        metadata: {
          chunk_type: e.chunkType,
          remove_reason: e.removeReason,
          condense_strategy: e.condenseStrategy,
          note_type: e.noteType,
          service: e.service,
          scope: e.scope,
        },
      }),
    }));

    // HuggingFace format includes metadata
    const output = {
      version: '1.0.0',
      description: 'Clinical note annotation training data exported from Note Clarity',
      features: {
        id: { dtype: 'int32' },
        text: { dtype: 'string' },
        label: { dtype: 'int32', class_label: { names: ['KEEP', 'CONDENSE', 'REMOVE'] } },
        label_text: { dtype: 'string' },
        ...(includeMetadata && {
          metadata: {
            chunk_type: { dtype: 'string' },
            remove_reason: { dtype: 'string' },
            condense_strategy: { dtype: 'string' },
            note_type: { dtype: 'string' },
            service: { dtype: 'string' },
            scope: { dtype: 'string' },
          },
        }),
      },
      data,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Main export function
   */
  static async exportTrainingData(
    userId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Fetch all data
    const [annotations, learnedRules] = await Promise.all([
      this.fetchAnnotations(userId),
      this.fetchLearnedRules(userId),
    ]);

    // Combine and dedupe
    const allExamples = [...annotations, ...learnedRules];
    const deduped = new Map<string, TrainingExample>();
    for (const example of allExamples) {
      const key = `${example.text.toLowerCase().trim()}::${example.label}`;
      if (!deduped.has(key)) {
        deduped.set(key, example);
      }
    }

    // Filter
    const filtered = this.filterExamples(Array.from(deduped.values()), options);

    // Generate content based on format
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (options.format) {
      case 'csv':
        content = this.toCSV(filtered, options.includeMetadata);
        filename = `training_data_${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;

      case 'huggingface':
        content = this.toHuggingFace(filtered, options.includeMetadata);
        filename = `training_data_${Date.now()}.json`;
        mimeType = 'application/json';
        break;

      case 'jsonl':
      default:
        content = this.toJSONL(filtered, options.includeMetadata);
        filename = `training_data_${Date.now()}.jsonl`;
        mimeType = 'application/x-ndjson';
        break;
    }

    // Record export in database
    await supabase.from('training_exports').insert({
      user_id: userId,
      export_name: filename,
      export_format: options.format,
      record_count: filtered.length,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    return {
      content,
      filename,
      mimeType,
      recordCount: filtered.length,
    };
  }

  /**
   * Download export as a file
   */
  static downloadExport(result: ExportResult): void {
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get export history for a user
   */
  static async getExportHistory(userId: string) {
    const { data, error } = await supabase
      .from('training_exports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get statistics about available training data
   */
  static async getTrainingDataStats(userId: string) {
    const [annotations, learnedRules] = await Promise.all([
      this.fetchAnnotations(userId),
      this.fetchLearnedRules(userId),
    ]);

    const allExamples = [...annotations, ...learnedRules];

    const labelCounts: Record<PrimaryLabel, number> = {
      KEEP: 0,
      CONDENSE: 0,
      REMOVE: 0,
    };

    const scopeCounts: Record<string, number> = {};
    const chunkTypeCounts: Record<string, number> = {};

    for (const example of allExamples) {
      labelCounts[example.label]++;
      scopeCounts[example.scope] = (scopeCounts[example.scope] || 0) + 1;
      chunkTypeCounts[example.chunkType] = (chunkTypeCounts[example.chunkType] || 0) + 1;
    }

    return {
      totalExamples: allExamples.length,
      fromAnnotations: annotations.length,
      fromLearnedRules: learnedRules.length,
      labelCounts,
      scopeCounts,
      chunkTypeCounts,
    };
  }
}
