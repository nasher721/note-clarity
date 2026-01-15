import { useState } from 'react';
import { DocumentChunk, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, ChunkType, REMOVE_REASON_LABELS } from '@/types/clinical';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Layers, Check, Scissors, Trash2, Sparkles } from 'lucide-react';

interface BulkActionsProps {
  chunks: DocumentChunk[];
  annotations: ChunkAnnotation[];
  onBulkAnnotate: (
    chunkIds: string[],
    label: PrimaryLabel,
    options: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
    }
  ) => Promise<void>;
}

const CHUNK_TYPE_LABELS: Record<ChunkType, string> = {
  section_header: 'Section Headers',
  paragraph: 'Paragraphs',
  bullet_list: 'Bullet Lists',
  imaging_report: 'Imaging Reports',
  lab_values: 'Lab Values',
  medication_list: 'Medication Lists',
  vital_signs: 'Vital Signs',
  attestation: 'Attestations',
  unknown: 'Other Text',
};

const BULK_PRESETS = [
  {
    id: 'attestations-remove',
    name: 'Mark all attestations as REMOVE',
    filter: (c: DocumentChunk) => c.type === 'attestation',
    label: 'REMOVE' as PrimaryLabel,
    removeReason: 'billing_attestation' as RemoveReason,
  },
  {
    id: 'boilerplate-remove',
    name: 'Mark all boilerplate as REMOVE',
    filter: (c: DocumentChunk) => c.suggestedLabel === 'REMOVE',
    label: 'REMOVE' as PrimaryLabel,
    removeReason: 'boilerplate_template' as RemoveReason,
  },
  {
    id: 'headers-keep',
    name: 'Mark all headers as KEEP',
    filter: (c: DocumentChunk) => c.type === 'section_header',
    label: 'KEEP' as PrimaryLabel,
  },
  {
    id: 'labs-condense',
    name: 'Condense all lab sections',
    filter: (c: DocumentChunk) => c.type === 'lab_values',
    label: 'CONDENSE' as PrimaryLabel,
    condenseStrategy: 'abnormal_only' as CondenseStrategy,
  },
];

export function BulkActions({ chunks, annotations, onBulkAnnotate }: BulkActionsProps) {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [selectedLabel, setSelectedLabel] = useState<PrimaryLabel | ''>('');
  const [removeReason, setRemoveReason] = useState<RemoveReason | ''>('');
  const [loading, setLoading] = useState(false);

  const getUnlabeledChunks = (filter: (c: DocumentChunk) => boolean) => {
    return chunks.filter(c => {
      const hasAnnotation = annotations.some(a => a.chunkId === c.id);
      return !hasAnnotation && filter(c);
    });
  };

  const getAllMatchingChunks = (filter: (c: DocumentChunk) => boolean) => {
    return chunks.filter(filter);
  };

  const handlePreset = async (preset: typeof BULK_PRESETS[0]) => {
    const matchingChunks = getAllMatchingChunks(preset.filter);
    if (matchingChunks.length === 0) return;

    setLoading(true);
    try {
      await onBulkAnnotate(
        matchingChunks.map(c => c.id),
        preset.label,
        {
          removeReason: preset.removeReason,
          condenseStrategy: preset.condenseStrategy,
          scope: 'this_document',
        }
      );
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomBulk = async () => {
    if (!filterType || !selectedLabel) return;
    
    const matchingChunks = chunks.filter(c => c.type === filterType);
    if (matchingChunks.length === 0) return;

    setLoading(true);
    try {
      await onBulkAnnotate(
        matchingChunks.map(c => c.id),
        selectedLabel,
        {
          removeReason: selectedLabel === 'REMOVE' ? removeReason || undefined : undefined,
          scope: 'this_document',
        }
      );
      setOpen(false);
      setFilterType('');
      setSelectedLabel('');
      setRemoveReason('');
    } finally {
      setLoading(false);
    }
  };

  // Count chunks by type
  const chunkTypeCounts = chunks.reduce((acc, chunk) => {
    acc[chunk.type] = (acc[chunk.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unlabeledCount = chunks.filter(c => !annotations.some(a => a.chunkId === c.id)).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          Bulk Actions
          {unlabeledCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unlabeledCount} unlabeled
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Bulk Label Chunks
          </DialogTitle>
          <DialogDescription>
            Apply labels to multiple chunks at once based on their type or characteristics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Actions</p>
            <div className="grid gap-2">
              {BULK_PRESETS.map(preset => {
                const matchingCount = getAllMatchingChunks(preset.filter).length;
                const unlabeledMatchingCount = getUnlabeledChunks(preset.filter).length;
                
                if (matchingCount === 0) return null;

                return (
                  <Card
                    key={preset.id}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handlePreset(preset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {preset.label === 'KEEP' && <Check className="h-4 w-4 text-label-keep" />}
                        {preset.label === 'CONDENSE' && <Scissors className="h-4 w-4 text-label-condense" />}
                        {preset.label === 'REMOVE' && <Trash2 className="h-4 w-4 text-label-remove" />}
                        <span className="text-sm">{preset.name}</span>
                      </div>
                      <Badge variant="outline">
                        {matchingCount} chunk{matchingCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom bulk action */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Custom Bulk Action</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Chunk Type</p>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(chunkTypeCounts).map(([type, count]) => (
                      <SelectItem key={type} value={type}>
                        {CHUNK_TYPE_LABELS[type as ChunkType] || type} ({count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Label</p>
                <Select value={selectedLabel} onValueChange={(v) => setSelectedLabel(v as PrimaryLabel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEEP">
                      <span className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-label-keep" /> Keep
                      </span>
                    </SelectItem>
                    <SelectItem value="CONDENSE">
                      <span className="flex items-center gap-2">
                        <Scissors className="h-3 w-3 text-label-condense" /> Condense
                      </span>
                    </SelectItem>
                    <SelectItem value="REMOVE">
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-3 w-3 text-label-remove" /> Remove
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedLabel === 'REMOVE' && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Reason for Removal</p>
                <Select value={removeReason} onValueChange={(v) => setRemoveReason(v as RemoveReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REMOVE_REASON_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleCustomBulk}
              disabled={!filterType || !selectedLabel || (selectedLabel === 'REMOVE' && !removeReason) || loading}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Apply to {filterType ? chunkTypeCounts[filterType] || 0 : 0} chunks
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
