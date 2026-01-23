import { DocumentUploader } from '@/components/clinical/DocumentUploader';
import { DocumentHistory } from '@/components/clinical/DocumentHistory';
import { Button } from '@/components/ui/button';
import { Layers, ClipboardList } from 'lucide-react';
import { ClinicalDocument } from '@/types/clinical';

export interface TrainingModePageProps {
  documents: ClinicalDocument[];
  docLoading: boolean;
  batchQueueLength: number;
  chartNotesLength: number;
  chartIsLoaded: boolean;
  onDocumentSubmit: (text: string, noteType?: string, service?: string) => Promise<ClinicalDocument | null>;
  onSelectDocument: (docId: string) => void;
  onSwitchToBatch: () => void;
  onSwitchToChart: () => void;
}

export function TrainingModePage({
  documents,
  docLoading,
  batchQueueLength,
  chartNotesLength,
  chartIsLoaded,
  onDocumentSubmit,
  onSelectDocument,
  onSwitchToBatch,
  onSwitchToChart,
}: TrainingModePageProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 p-4 bg-accent/30 rounded-lg border border-accent">
        <h2 className="font-semibold mb-2">Training Mode</h2>
        <p className="text-sm text-muted-foreground">
          Upload a clinical document to begin labeling chunks. Your annotations are saved 
          to the cloud and used to train rules that can automatically clean future documents.
        </p>
      </div>
      
      <div className="flex gap-3 mb-6">
        <DocumentUploader onDocumentSubmit={onDocumentSubmit} />
      </div>
      
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-muted-foreground">or switch mode</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-3 justify-center mb-8">
        <Button variant="outline" onClick={onSwitchToBatch} className="gap-2">
          <Layers className="h-4 w-4" />
          Batch Mode {batchQueueLength > 0 && `(${batchQueueLength})`}
        </Button>
        <Button variant="outline" onClick={onSwitchToChart} className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Chart Mode {chartIsLoaded && `(${chartNotesLength})`}
        </Button>
      </div>
      
      {documents.length > 0 && (
        <div className="mt-8">
          <DocumentHistory 
            documents={documents} 
            onSelect={onSelectDocument}
            loading={docLoading}
          />
        </div>
      )}
    </div>
  );
}
