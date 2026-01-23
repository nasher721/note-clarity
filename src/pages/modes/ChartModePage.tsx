import { useState } from 'react';
import { ChartUploader } from '@/components/clinical/ChartUploader';
import { ChartQueuePanel } from '@/components/clinical/ChartQueuePanel';
import { ChunkViewer } from '@/components/clinical/ChunkViewer';
import { LabelingPanel } from '@/components/clinical/LabelingPanel';
import { DiffPreview } from '@/components/clinical/DiffPreview';
import { BulkActions } from '@/components/clinical/BulkActions';
import { TextAnnotator } from '@/components/clinical/TextAnnotator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, LayoutGrid, Highlighter, Check, Scissors, Trash2 } from 'lucide-react';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { useNavigationShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ClinicalDocument, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope, TextHighlight } from '@/types/clinical';
import { ParsedNote } from '@/utils/chartParser';

import { ChartNoteItem } from '@/components/clinical/ChartQueuePanel';

interface ChartModePageProps {
  // Chart state
  patientId: string;
  currentIndex: number;
  currentDocument: ClinicalDocument | null;
  noteItems: ChartNoteItem[];
  chartIsLoaded: boolean;
  
  // Chart actions
  loadChart: (patientId: string, notes: ParsedNote[]) => void;
  clearChart: () => void;
  goToNote: (index: number) => void;
  nextNote: () => void;
  prevNote: () => void;
  
  // Annotation actions
  annotateChunk: (chunkId: string, label: PrimaryLabel, options?: {
    removeReason?: RemoveReason;
    condenseStrategy?: CondenseStrategy;
    scope?: LabelScope;
    overrideJustification?: string;
  }) => Promise<void>;
  bulkAnnotateChunks: (chunkIds: string[], label: PrimaryLabel, options?: {
    removeReason?: RemoveReason;
    condenseStrategy?: CondenseStrategy;
    scope?: LabelScope;
  }) => Promise<void>;
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

export function ChartModePage({
  patientId,
  currentIndex,
  currentDocument,
  noteItems,
  chartIsLoaded,
  loadChart,
  clearChart,
  goToNote,
  nextNote,
  prevNote,
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
}: ChartModePageProps) {
  const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  
  const currentAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;
  const highlightStats = getHighlightStats();

  // Keyboard navigation
  useNavigationShortcuts({
    onPrev: prevNote,
    onNext: nextNote,
    onNextUnlabeled: () => {
      const nextUnlabeled = noteItems.findIndex((n, i) => 
        i > currentIndex && n.annotationCount === 0
      );
      if (nextUnlabeled !== -1) {
        goToNote(nextUnlabeled);
      }
    },
  }, chartIsLoaded);

  // Chart not loaded - show uploader
  if (!chartIsLoaded) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6 p-4 bg-accent/30 rounded-lg border border-accent">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Chart Mode</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a complete patient chart. Notes are automatically split by headers like 
            "Progress Note", "H&P", dates, etc.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <ChartUploader onChartSubmit={(patientId, notes) => {
            loadChart(patientId, notes);
          }} />
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={onSwitchToTraining}>
            Back to Single Mode
          </Button>
        </div>
      </div>
    );
  }

  // No current document - shouldn't happen but handle gracefully
  if (!currentDocument) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No notes in chart.</p>
        <Button variant="outline" onClick={clearChart} className="mt-4">
          Clear Chart
        </Button>
      </div>
    );
  }

  // Document loaded - show annotation workspace
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Chart queue sidebar */}
      <ResizablePanel defaultSize={20} minSize={15}>
        <div className="h-full flex flex-col">
          <div className="panel-header">Patient Chart</div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <ChartQueuePanel
                patientId={patientId}
                notes={noteItems}
                currentIndex={currentIndex}
                onGoToNote={goToNote}
                onNext={nextNote}
                onPrev={prevNote}
                onClear={clearChart}
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
                  onBulkAnnotate={bulkAnnotateChunks}
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
                  clearChart();
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear
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
      <ResizablePanel defaultSize={20} minSize={15}>
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
      <ResizablePanel defaultSize={30} minSize={20}>
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
