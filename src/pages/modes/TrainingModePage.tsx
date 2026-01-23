import { useState, useMemo } from 'react';
import { DocumentUploader } from '@/components/clinical/DocumentUploader';
import { ChunkViewer } from '@/components/clinical/ChunkViewer';
import { LabelingPanel } from '@/components/clinical/LabelingPanel';
import { DiffPreview } from '@/components/clinical/DiffPreview';
import { DocumentHistory } from '@/components/clinical/DocumentHistory';
import { BulkActions } from '@/components/clinical/BulkActions';
import { TextAnnotator } from '@/components/clinical/TextAnnotator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Layers, ClipboardList, LayoutGrid, Highlighter, Check, Scissors, Trash2 } from 'lucide-react';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { ClinicalDocument, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, TextHighlight } from '@/types/clinical';

interface TrainingModePageProps {
  // Document state
  documents: ClinicalDocument[];
  currentDocument: ClinicalDocument | null;
  selectedChunkId: string | null;
  docLoading: boolean;
  
  // Document actions
  createDocument: (text: string, noteType?: string, service?: string) => Promise<ClinicalDocument | null>;
  selectDocument: (docId: string) => void;
  setSelectedChunkId: (id: string | null) => void;
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
  highlightsLoading: boolean;
  addHighlight: (highlight: Omit<TextHighlight, 'id' | 'timestamp' | 'userId'>) => void;
  removeHighlight: (highlightId: string) => void;
  updateHighlight: (highlightId: string, updates: Partial<TextHighlight>) => void;
  clearHighlights: () => void;
  getHighlightStats: () => { total: number; keep: number; condense: number; remove: number };
  
  // Mode switching
  onSwitchToBatch: () => void;
  onSwitchToChart: () => void;
  batchQueueLength: number;
  chartNotesLength: number;
  chartIsLoaded: boolean;
}

export function TrainingModePage({
  documents,
  currentDocument,
  selectedChunkId,
  docLoading,
  createDocument,
  selectDocument,
  setSelectedChunkId,
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
  onSwitchToBatch,
  onSwitchToChart,
  batchQueueLength,
  chartNotesLength,
  chartIsLoaded,
}: TrainingModePageProps) {
  const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');
  
  const currentAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;
  const highlightStats = getHighlightStats();

  // No document loaded - show uploader
  if (!currentDocument) {
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
          <DocumentUploader onDocumentSubmit={createDocument} />
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
              onSelect={selectDocument}
              loading={docLoading}
            />
          </div>
        )}
      </div>
    );
  }

  // Document loaded - show annotation workspace
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Document panel */}
      <ResizablePanel defaultSize={40} minSize={25}>
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
                  ({currentDocument.chunks.length} segments)
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
                  chunks={currentDocument.chunks}
                  annotations={currentDocument.annotations}
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
                onClick={() => {
                  setSelectedChunkId(null);
                  clearHighlights();
                  selectDocument('');
                }}
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
                  chunks={currentDocument.chunks}
                  annotations={currentDocument.annotations}
                  selectedChunkId={selectedChunkId}
                  onChunkSelect={setSelectedChunkId}
                />
              </div>
            </ScrollArea>
          ) : (
            <TextAnnotator
              text={currentDocument.originalText}
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
      <ResizablePanel defaultSize={25} minSize={15}>
        <div className="h-full flex flex-col">
          <div className="panel-header">Labeling</div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              <LabelingPanel
                chunk={currentDocument.chunks.find(c => c.id === selectedChunkId) || null}
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
      <ResizablePanel defaultSize={35} minSize={20}>
        <div className="h-full flex flex-col">
          <div className="panel-header">Live Preview</div>
          <div className="flex-1 overflow-hidden">
            <DiffPreview
              chunks={currentDocument.chunks}
              annotations={currentDocument.annotations}
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
