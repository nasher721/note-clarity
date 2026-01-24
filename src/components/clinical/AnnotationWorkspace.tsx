import { ChunkViewer } from '@/components/clinical/ChunkViewer';
import { LabelingPanel } from '@/components/clinical/LabelingPanel';
import { DiffPreview } from '@/components/clinical/DiffPreview';
import { BulkActions } from '@/components/clinical/BulkActions';
import { BatchQueuePanel } from '@/components/clinical/BatchQueuePanel';
import { ChartQueuePanel, ChartNoteItem } from '@/components/clinical/ChartQueuePanel';
import { TextAnnotator } from '@/components/clinical/TextAnnotator';
import { UndoRedoButtons } from '@/components/clinical/UndoRedoButtons';
import { AnnotationStatusBar } from '@/components/clinical/AnnotationStatusBar';
import { AIAssistantWidget } from '@/components/intelligence/AIAssistantWidget';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { LayoutGrid, Highlighter, Check, Scissors, Trash2 } from 'lucide-react';
import { 
  ClinicalDocument, 
  ChunkAnnotation, 
  PrimaryLabel, 
  RemoveReason, 
  CondenseStrategy, 
  LabelScope,
  TextHighlight 
} from '@/types/clinical';
import { BatchDocument } from '@/hooks/useBatchProcessor';

interface AnnotationWorkspaceProps {
  mode: 'training' | 'batch' | 'chart';
  activeDocument: ClinicalDocument | null | undefined;
  activeSelectedChunkId: string | null;
  activeAnnotation: ChunkAnnotation | undefined;
  annotationView: 'chunks' | 'highlight';
  highlights: TextHighlight[];
  highlightStats: { total: number; keep: number; condense: number; remove: number };
  // Batch mode props
  batchQueue: BatchDocument[];
  currentBatchIndex: number;
  batchIsProcessing: boolean;
  batchStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    totalAnnotations: number;
  };
  // Chart mode props
  chartPatientId: string | null;
  chartNoteItems: ChartNoteItem[];
  chartCurrentIndex: number;
  // Callbacks
  onChunkSelect: (chunkId: string | null) => void;
  onAnnotationViewChange: (view: 'chunks' | 'highlight') => void;
  onAnnotate: (
    chunkId: string,
    label: PrimaryLabel,
    options: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
      overrideJustification?: string;
    }
  ) => void;
  onRemoveAnnotation: (chunkId: string) => void;
  onClearAllAnnotations: () => void;
  onBulkAnnotate: (
    chunkIds: string[],
    label: PrimaryLabel,
    options?: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
    }
  ) => Promise<void>;
  onAddHighlight: (highlight: Omit<TextHighlight, 'id' | 'timestamp' | 'userId'>) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onUpdateHighlight: (highlightId: string, updates: Partial<TextHighlight>) => void;
  onClearHighlights: () => void;
  // Batch navigation
  onBatchGoToDocument: (index: number) => void;
  onBatchNext: () => void;
  onBatchPrev: () => void;
  onBatchStartProcessing: () => void;
  onBatchRemove: (id: string) => void;
  onBatchClear: () => void;
  // Chart navigation
  onChartGoToNote: (index: number) => void;
  onChartNext: () => void;
  onChartPrev: () => void;
  onChartClear: () => void;
  // Document actions
  onNewDocument: () => void;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
}

export function AnnotationWorkspace({
  mode,
  activeDocument,
  activeSelectedChunkId,
  activeAnnotation,
  annotationView,
  highlights,
  highlightStats,
  batchQueue,
  currentBatchIndex,
  batchIsProcessing,
  batchStats,
  chartPatientId,
  chartNoteItems,
  chartCurrentIndex,
  onChunkSelect,
  onAnnotationViewChange,
  onAnnotate,
  onRemoveAnnotation,
  onClearAllAnnotations,
  onBulkAnnotate,
  onAddHighlight,
  onRemoveHighlight,
  onUpdateHighlight,
  onClearHighlights,
  onBatchGoToDocument,
  onBatchNext,
  onBatchPrev,
  onBatchStartProcessing,
  onBatchRemove,
  onBatchClear,
  onChartGoToNote,
  onChartNext,
  onChartPrev,
  onChartClear,
  onNewDocument,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
}: AnnotationWorkspaceProps) {
  const noteSummary = activeDocument
    ? `Note type: ${activeDocument.noteType ?? 'General'} · ${activeDocument.chunks.length} segments`
    : undefined;
  const noteTitle = activeDocument?.noteType ?? 'Clinical Note';
  const annotatedCount = activeDocument?.annotations.length ?? 0;
  const totalChunks = activeDocument?.chunks.length ?? 0;

  if (!activeDocument) {
    return null;
  }

  return (
    <TooltipProvider>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Batch queue sidebar */}
        {mode === 'batch' && (
          <>
            <ResizablePanel defaultSize={20} minSize={15}>
              <div className="h-full flex flex-col">
                <div className="panel-header">Batch Queue</div>
                <ScrollArea className="flex-1">
                  <div className="p-3">
                    <BatchQueuePanel
                      queue={batchQueue}
                      currentIndex={currentBatchIndex}
                      isProcessing={batchIsProcessing}
                      stats={batchStats}
                      onGoToDocument={onBatchGoToDocument}
                      onNext={onBatchNext}
                      onPrev={onBatchPrev}
                      onStartProcessing={onBatchStartProcessing}
                      onRemove={onBatchRemove}
                      onClear={onBatchClear}
                    />
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Chart queue sidebar */}
        {mode === 'chart' && (
          <>
            <ResizablePanel defaultSize={20} minSize={15}>
              <div className="h-full flex flex-col">
                <div className="panel-header">Patient Chart</div>
                <ScrollArea className="flex-1">
                  <div className="p-3">
                    <ChartQueuePanel
                      patientId={chartPatientId ?? ''}
                      notes={chartNoteItems}
                      currentIndex={chartCurrentIndex}
                      onGoToNote={onChartGoToNote}
                      onNext={onChartNext}
                      onPrev={onChartPrev}
                      onClear={onChartClear}
                    />
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Document panel - with view toggle */}
        <ResizablePanel defaultSize={(mode === 'batch' || mode === 'chart') ? 30 : 40} minSize={25}>
          <div className="h-full flex flex-col">
            <div className="panel-header flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Undo/Redo buttons */}
                <UndoRedoButtons
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={onUndo}
                  onRedo={onRedo}
                  undoCount={undoCount}
                  redoCount={redoCount}
                />
                
                <div className="h-4 w-px bg-border" />
                
                {/* View mode toggle */}
                <Tabs value={annotationView} onValueChange={(v) => onAnnotationViewChange(v as 'chunks' | 'highlight')}>
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
                    ({activeDocument?.chunks.length || 0} segments)
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
                {activeDocument && annotationView === 'chunks' && (
                  <BulkActions
                    chunks={activeDocument.chunks}
                    annotations={activeDocument.annotations}
                    onBulkAnnotate={onBulkAnnotate}
                  />
                )}
                {annotationView === 'highlight' && highlights.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearHighlights}
                    className="text-xs h-6 px-2 text-muted-foreground"
                  >
                    Clear All
                  </Button>
                )}
                <button 
                  onClick={onNewDocument}
                  className="text-xs text-primary hover:underline"
                >
                  {mode === 'chart' ? 'Clear' : 'New'}
                </button>
              </div>
            </div>

            <AnnotationStatusBar
              annotationView={annotationView}
              annotatedCount={annotatedCount}
              totalChunks={totalChunks}
              highlightStats={highlightStats}
            />
            
            {/* Content based on annotation view */}
            {annotationView === 'chunks' ? (
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {activeDocument && (
                    <ChunkViewer
                      chunks={activeDocument.chunks}
                      annotations={activeDocument.annotations}
                      selectedChunkId={activeSelectedChunkId}
                      onChunkSelect={onChunkSelect}
                      onQuickLabel={(chunkId, label) => {
                        onAnnotate(chunkId, label, {});
                      }}
                      onRemoveLabel={onRemoveAnnotation}
                    />
                  )}
                </div>
              </ScrollArea>
            ) : (
              activeDocument && (
                <TextAnnotator
                  text={activeDocument.originalText}
                  highlights={highlights}
                  onAddHighlight={onAddHighlight}
                  onRemoveHighlight={onRemoveHighlight}
                  onUpdateHighlight={onUpdateHighlight}
                />
              )
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Labeling panel - sticky floating */}
        <ResizablePanel defaultSize={(mode === 'batch' || mode === 'chart') ? 20 : 25} minSize={15}>
          <div className="h-full flex flex-col relative">
            <div className="sticky top-0 z-10 bg-background">
              <div className="panel-header flex items-center justify-between">
                <span>Labeling</span>
                {activeDocument && activeDocument.annotations.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAllAnnotations}
                    className="text-xs h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Clear All ({activeDocument.annotations.length})
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="sticky top-0 p-4">
                <LabelingPanel
                  chunk={activeDocument?.chunks.find(c => c.id === activeSelectedChunkId) || null}
                  currentLabel={activeAnnotation?.label}
                  currentReason={activeAnnotation?.removeReason}
                  currentStrategy={activeAnnotation?.condenseStrategy}
                  currentScope={activeAnnotation?.scope}
                  onAnnotate={(label, options) => {
                    if (activeSelectedChunkId) {
                      onAnnotate(activeSelectedChunkId, label, options);
                    }
                  }}
                  onClear={() => {
                    if (activeSelectedChunkId) {
                      onRemoveAnnotation(activeSelectedChunkId);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview panel */}
        <ResizablePanel defaultSize={(mode === 'batch' || mode === 'chart') ? 30 : 40} minSize={20}>
          <div className="h-full flex flex-col">
            <div className="panel-header">Live Preview</div>
            <div className="flex-1 overflow-hidden">
              {activeDocument && (
                <DiffPreview
                  chunks={activeDocument.chunks}
                  annotations={activeDocument.annotations}
                  originalText={activeDocument.originalText}
                  highlights={highlights}
                  mode={annotationView}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      {activeDocument && <AIAssistantWidget noteSummary={noteSummary} noteTitle={noteTitle} />}
    </TooltipProvider>
  );
}
