import { useState } from 'react';
import { BatchUploader } from '@/components/clinical/BatchUploader';
import { BatchQueuePanel } from '@/components/clinical/BatchQueuePanel';
import { ChunkViewer } from '@/components/clinical/ChunkViewer';
import { LabelingPanel } from '@/components/clinical/LabelingPanel';
import { DiffPreview } from '@/components/clinical/DiffPreview';
import { BulkActions } from '@/components/clinical/BulkActions';
import { TextAnnotator } from '@/components/clinical/TextAnnotator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layers, LayoutGrid, Highlighter, Check, Scissors, Trash2 } from 'lucide-react';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { useNavigationShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ClinicalDocument, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, TextHighlight } from '@/types/clinical';

import { BatchDocument } from '@/hooks/useBatchProcessor';

interface BatchModePageProps {
  // Batch state
  batchQueue: BatchDocument[];
  currentBatchIndex: number;
  currentBatchDocument: BatchDocument | undefined;
  isProcessing: boolean;
  batchStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    totalAnnotations: number;
  };
  
  // Batch actions
  addToBatch: (items: { text: string; noteType?: string }[]) => void;
  startProcessing: () => void;
  goToBatchDocument: (index: number) => void;
  nextBatchDocument: () => void;
  prevBatchDocument: () => void;
  removeFromBatch: (id: string) => void;
  clearBatch: () => void;
  
  // Annotation actions
  annotateChunk: (chunkId: string, label: PrimaryLabel, options?: {
    removeReason?: RemoveReason;
    condenseStrategy?: CondenseStrategy;
    scope?: LabelScope;
    overrideJustification?: string;
  }) => void;
  bulkAnnotateChunks: (chunkIds: string[], label: PrimaryLabel, options?: {
    removeReason?: RemoveReason;
    condenseStrategy?: CondenseStrategy;
    scope?: LabelScope;
  }) => Promise<void> | void;
  removeAnnotation: (chunkId: string) => void;
  getAnnotation: (chunkId: string) => ChunkAnnotation | undefined;
  
  // Highlight state
  highlights: TextHighlight[];
  addHighlight: (highlight: Omit<TextHighlight, 'id' | 'timestamp' | 'userId'>) => void;
  removeHighlight: (highlightId: string) => void;
  updateHighlight: (highlightId: string, updates: Partial<TextHighlight>) => void;
  clearHighlights: () => void;
  getHighlightStats: () => { total: number; keep: number; condense: number; remove: number };
  
  // Mode switching
  onSwitchToTraining: () => void;
}

export function BatchModePage({
  batchQueue,
  currentBatchIndex,
  currentBatchDocument,
  isProcessing,
  batchStats,
  addToBatch,
  startProcessing,
  goToBatchDocument,
  nextBatchDocument,
  prevBatchDocument,
  removeFromBatch,
  clearBatch,
  annotateChunk,
  bulkAnnotateChunks,
  removeAnnotation,
  getAnnotation,
  highlights,
  addHighlight,
  removeHighlight,
  updateHighlight,
  clearHighlights,
  getHighlightStats,
  onSwitchToTraining,
}: BatchModePageProps) {
  const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  
  const activeDocument = currentBatchDocument?.document;
  const currentAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;
  const highlightStats = getHighlightStats();

  // Keyboard navigation
  useNavigationShortcuts({
    onPrev: prevBatchDocument,
    onNext: nextBatchDocument,
    onNextUnlabeled: () => {
      const nextUnlabeled = batchQueue.findIndex((d, i) => 
        i > currentBatchIndex && d.annotationCount === 0
      );
      if (nextUnlabeled !== -1) {
        goToBatchDocument(nextUnlabeled);
      }
    },
  }, true);

  // No document loaded - show uploader
  if (!activeDocument) {
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
            <BatchUploader onBatchSubmit={addToBatch} />
          </div>
          <div>
            <BatchQueuePanel
              queue={batchQueue}
              currentIndex={currentBatchIndex}
              isProcessing={isProcessing}
              stats={batchStats}
              onGoToDocument={goToBatchDocument}
              onNext={nextBatchDocument}
              onPrev={prevBatchDocument}
              onStartProcessing={startProcessing}
              onRemove={removeFromBatch}
              onClear={clearBatch}
            />
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={onSwitchToTraining}>
            Back to Single Mode
          </Button>
        </div>
      </div>
    );
  }

  // Document loaded - show annotation workspace
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Batch queue sidebar */}
      <ResizablePanel defaultSize={20} minSize={15}>
        <div className="h-full flex flex-col">
          <div className="panel-header">Batch Queue</div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <BatchQueuePanel
                queue={batchQueue}
                currentIndex={currentBatchIndex}
                isProcessing={isProcessing}
                stats={batchStats}
                onGoToDocument={goToBatchDocument}
                onNext={nextBatchDocument}
                onPrev={prevBatchDocument}
                onStartProcessing={startProcessing}
                onRemove={removeFromBatch}
                onClear={clearBatch}
              />
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />

      {/* Document panel */}
      <ResizablePanel defaultSize={30} minSize={25}>
        <div className="h-full flex flex-col">
          <div className="panel-header flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tabs value={annotationView} onValueChange={(v) => setAnnotationView(v as 'chunks' | 'highlight')}>
                <TabsList className="h-7">
                  <TabsTrigger value="chunks" className="text-xs gap-1 px-2 h-6">
                    <LayoutGrid className="h-3 w-3" />
                    Chunks
                  </TabsTrigger>
                  <TabsTrigger value="highlight" className="text-xs gap-1 px-2 h-6">
                    <Highlighter className="h-3 w-3" />
                    Highlight
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {annotationView === 'chunks' && (
                <span className="text-xs text-muted-foreground">
                  ({activeDocument.chunks.length} segments)
                </span>
              )}
              
              {annotationView === 'highlight' && (
                <div className="flex items-center gap-1.5">
                  {highlightStats.keep > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0 h-5 bg-green-100 dark:bg-green-900/30 border-green-300">
                      <Check className="h-2.5 w-2.5" />
                      {highlightStats.keep}
                    </Badge>
                  )}
                  {highlightStats.condense > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0 h-5 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300">
                      <Scissors className="h-2.5 w-2.5" />
                      {highlightStats.condense}
                    </Badge>
                  )}
                  {highlightStats.remove > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 py-0 h-5 bg-red-100 dark:bg-red-900/30 border-red-300">
                      <Trash2 className="h-2.5 w-2.5" />
                      {highlightStats.remove}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {annotationView === 'chunks' && (
                <BulkActions
                  chunks={activeDocument.chunks}
                  annotations={activeDocument.annotations}
                  onBulkAnnotate={(chunkIds, label, options) => Promise.resolve(bulkAnnotateChunks(chunkIds, label, options))}
                />
              )}
              {annotationView === 'highlight' && highlights.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHighlights}
                  className="text-xs h-6 px-2 text-muted-foreground"
                >
                  Clear All
                </Button>
              )}
              <button 
                onClick={onSwitchToTraining}
                className="text-xs text-primary hover:underline"
              >
                New
              </button>
            </div>
          </div>
          
          {annotationView === 'chunks' ? (
            <ScrollArea className="flex-1">
              <div className="p-4">
                <ChunkViewer
                  chunks={activeDocument.chunks}
                  annotations={activeDocument.annotations}
                  selectedChunkId={selectedChunkId}
                  onChunkSelect={setSelectedChunkId}
                />
              </div>
            </ScrollArea>
          ) : (
            <TextAnnotator
              text={activeDocument.originalText}
              highlights={highlights}
              onAddHighlight={addHighlight}
              onRemoveHighlight={removeHighlight}
              onUpdateHighlight={updateHighlight}
            />
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Labeling panel */}
      <ResizablePanel defaultSize={20} minSize={15}>
        <div className="h-full flex flex-col">
          <div className="panel-header">Labeling</div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <LabelingPanel
                chunk={activeDocument.chunks.find(c => c.id === selectedChunkId) || null}
                currentLabel={currentAnnotation?.label}
                currentReason={currentAnnotation?.removeReason}
                currentStrategy={currentAnnotation?.condenseStrategy}
                currentScope={currentAnnotation?.scope}
                onAnnotate={(label, options) => {
                  if (selectedChunkId) {
                    annotateChunk(selectedChunkId, label, options);
                  }
                }}
                onClear={() => {
                  if (selectedChunkId) {
                    removeAnnotation(selectedChunkId);
                  }
                }}
              />
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Preview panel */}
      <ResizablePanel defaultSize={30} minSize={20}>
        <div className="h-full flex flex-col">
          <div className="panel-header">Live Preview</div>
          <div className="flex-1 overflow-hidden">
            <DiffPreview
              chunks={activeDocument.chunks}
              annotations={activeDocument.annotations}
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
