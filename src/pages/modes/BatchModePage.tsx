import { BatchUploader } from '@/components/clinical/BatchUploader';
import { BatchQueuePanel } from '@/components/clinical/BatchQueuePanel';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';
import { BatchDocument } from '@/hooks/useBatchProcessor';

export interface BatchModePageProps {
  queue: BatchDocument[];
  currentIndex: number;
  isProcessing: boolean;
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    totalAnnotations: number;
  };
  onBatchSubmit: (items: { text: string; noteType?: string }[]) => void;
  onGoToDocument: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onStartProcessing: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onBackToTraining: () => void;
}

export function BatchModePage({
  queue,
  currentIndex,
  isProcessing,
  stats,
  onBatchSubmit,
  onGoToDocument,
  onNext,
  onPrev,
  onStartProcessing,
  onRemove,
  onClear,
  onBackToTraining,
}: BatchModePageProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 p-4 bg-accent/30 rounded-lg border border-accent">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Batch Mode</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Process multiple patient notes in sequence. Upload notes and they'll be queued for labeling.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <BatchUploader onBatchSubmit={onBatchSubmit} />
        </div>
        <div>
          <BatchQueuePanel
            queue={queue}
            currentIndex={currentIndex}
            isProcessing={isProcessing}
            stats={stats}
            onGoToDocument={onGoToDocument}
            onNext={onNext}
            onPrev={onPrev}
            onStartProcessing={onStartProcessing}
            onRemove={onRemove}
            onClear={onClear}
          />
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={onBackToTraining}>
          Back to Single Mode
        </Button>
      </div>
    </div>
  );
}
