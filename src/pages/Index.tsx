import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/clinical/Header';
import { DocumentUploader } from '@/components/clinical/DocumentUploader';
import { ChunkViewer } from '@/components/clinical/ChunkViewer';
import { LabelingPanel } from '@/components/clinical/LabelingPanel';
import { DiffPreview } from '@/components/clinical/DiffPreview';
import { InferenceMode } from '@/components/clinical/InferenceMode';
import { DocumentHistory } from '@/components/clinical/DocumentHistory';
import { BulkActions } from '@/components/clinical/BulkActions';
import { BatchUploader } from '@/components/clinical/BatchUploader';
import { BatchQueuePanel } from '@/components/clinical/BatchQueuePanel';
import { ChartUploader } from '@/components/clinical/ChartUploader';
import { ChartQueuePanel } from '@/components/clinical/ChartQueuePanel';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { useChartProcessor } from '@/hooks/useChartProcessor';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Layers, ClipboardList } from 'lucide-react';
import { ChunkAnnotation } from '@/types/clinical';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [mode, setMode] = useState<'training' | 'inference' | 'batch' | 'chart'>('training');
  const [learnedRules, setLearnedRules] = useState<ChunkAnnotation[]>([]);
  
  const {
    documents,
    currentDocument,
    selectedChunkId,
    setSelectedChunkId,
    createDocument,
    annotateChunk,
    bulkAnnotateChunks,
    removeAnnotation,
    getAnnotation,
    selectDocument,
    getLearnedRules,
    loading: docLoading,
  } = useDocumentStore(user?.id);

  const {
    batchQueue,
    currentBatchIndex,
    currentBatchDocument,
    isProcessing,
    stats: batchStats,
    addToBatch,
    startProcessing,
    goToDocument: goToBatchDocument,
    nextDocument: nextBatchDocument,
    prevDocument: prevBatchDocument,
    updateAnnotationCount,
    removeFromBatch,
    clearBatch,
  } = useBatchProcessor(user?.id);

  const {
    patientId: chartPatientId,
    currentIndex: chartCurrentIndex,
    currentDocument: chartCurrentDocument,
    noteItems: chartNoteItems,
    stats: chartStats,
    isLoaded: chartIsLoaded,
    loadChart,
    clearChart,
    goToNote: goToChartNote,
    nextNote: nextChartNote,
    prevNote: prevChartNote,
    annotateChunk: chartAnnotateChunk,
    bulkAnnotateChunks: chartBulkAnnotateChunks,
    removeAnnotation: chartRemoveAnnotation,
    getAnnotation: chartGetAnnotation,
  } = useChartProcessor(user?.id);

  // Selected chunk for chart mode
  const [chartSelectedChunkId, setChartSelectedChunkId] = useState<string | null>(null);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Load learned rules when switching to inference mode
  useEffect(() => {
    if (mode === 'inference' && user?.id) {
      getLearnedRules().then(setLearnedRules);
    }
  }, [mode, user?.id, getLearnedRules]);

  // Keyboard navigation for batch mode
  useEffect(() => {
    if (mode !== 'batch') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        prevBatchDocument();
      } else if (e.key === 'ArrowRight') {
        nextBatchDocument();
      } else if (e.key === 'n' || e.key === 'N') {
        // Jump to next unlabeled
        const nextUnlabeled = batchQueue.findIndex((d, i) => 
          i > currentBatchIndex && d.annotationCount === 0
        );
        if (nextUnlabeled !== -1) {
          goToBatchDocument(nextUnlabeled);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentBatchIndex, batchQueue, prevBatchDocument, nextBatchDocument, goToBatchDocument]);

  // Keyboard navigation for chart mode
  useEffect(() => {
    if (mode !== 'chart' || !chartIsLoaded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        prevChartNote();
      } else if (e.key === 'ArrowRight') {
        nextChartNote();
      } else if (e.key === 'n' || e.key === 'N') {
        // Jump to next unlabeled
        const nextUnlabeled = chartNoteItems.findIndex((n, i) => 
          i > chartCurrentIndex && n.annotationCount === 0
        );
        if (nextUnlabeled !== -1) {
          goToChartNote(nextUnlabeled);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, chartIsLoaded, chartCurrentIndex, chartNoteItems, prevChartNote, nextChartNote, goToChartNote]);

  // Update annotation count when annotations change in batch mode
  useEffect(() => {
    if (mode === 'batch' && currentBatchDocument?.document) {
      const annotationCount = currentBatchDocument.document.annotations.length;
      updateAnnotationCount(currentBatchDocument.id, annotationCount);
    }
  }, [mode, currentBatchDocument?.document?.annotations.length]);

  const selectedChunk = currentDocument?.chunks.find(c => c.id === selectedChunkId);
  const currentAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;

  // Chart mode annotation
  const chartCurrentAnnotation = chartSelectedChunkId ? chartGetAnnotation(chartSelectedChunkId) : undefined;

  // Get document to display based on mode
  const activeDocument = mode === 'batch' && currentBatchDocument?.document 
    ? currentBatchDocument.document 
    : mode === 'chart' && chartCurrentDocument
    ? chartCurrentDocument
    : currentDocument;

  // Get selected chunk ID and annotation based on mode
  const activeSelectedChunkId = mode === 'chart' ? chartSelectedChunkId : selectedChunkId;
  const activeAnnotation = mode === 'chart' ? chartCurrentAnnotation : currentAnnotation;
  const setActiveSelectedChunkId = mode === 'chart' ? setChartSelectedChunkId : setSelectedChunkId;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (mode === 'inference') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header 
          mode={mode} 
          onModeChange={setMode} 
          user={user}
          onSignOut={signOut}
        />
        <main className="flex-1 overflow-hidden">
          <InferenceMode learnedAnnotations={learnedRules} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header 
        mode={mode} 
        onModeChange={setMode}
        user={user}
        onSignOut={signOut}
      />
      
      <main className="flex-1 overflow-hidden">
        {/* Training mode - no document */}
        {!activeDocument && mode === 'training' ? (
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
              <Button
                variant="outline"
                onClick={() => setMode('batch')}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Batch Mode {batchQueue.length > 0 && `(${batchQueue.length})`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setMode('chart')}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Chart Mode {chartIsLoaded && `(${chartNoteItems.length})`}
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
        ) : mode === 'batch' && !currentBatchDocument?.document ? (
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
              <Button variant="outline" onClick={() => setMode('training')}>
                Back to Single Mode
              </Button>
            </div>
          </div>
        ) : mode === 'chart' && !chartIsLoaded ? (
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
              <Button variant="outline" onClick={() => setMode('training')}>
                Back to Single Mode
              </Button>
            </div>
          </div>
        ) : (
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
                          patientId={chartPatientId}
                          notes={chartNoteItems}
                          currentIndex={chartCurrentIndex}
                          onGoToNote={goToChartNote}
                          onNext={nextChartNote}
                          onPrev={prevChartNote}
                          onClear={clearChart}
                        />
                      </div>
                    </ScrollArea>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Document chunks panel */}
            <ResizablePanel defaultSize={(mode === 'batch' || mode === 'chart') ? 30 : 35} minSize={20}>
              <div className="h-full flex flex-col">
                <div className="panel-header flex items-center justify-between gap-2">
                  <span>
                    {mode === 'chart' ? 'Note Chunks' : 'Document Chunks'}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({activeDocument?.chunks.length || 0} segments)
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    {activeDocument && (
                      <BulkActions
                        chunks={activeDocument.chunks}
                        annotations={activeDocument.annotations}
                        onBulkAnnotate={mode === 'chart' ? chartBulkAnnotateChunks : bulkAnnotateChunks}
                      />
                    )}
                    <button 
                      onClick={() => {
                        setActiveSelectedChunkId(null);
                        if (mode === 'chart') {
                          clearChart();
                        } else if (mode === 'batch') {
                          setMode('training');
                        } else {
                          selectDocument('');
                        }
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {mode === 'chart' ? 'Clear' : 'New'}
                    </button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {activeDocument && (
                      <ChunkViewer
                        chunks={activeDocument.chunks}
                        annotations={activeDocument.annotations}
                        selectedChunkId={activeSelectedChunkId}
                        onChunkSelect={setActiveSelectedChunkId}
                      />
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Labeling panel */}
            <ResizablePanel defaultSize={(mode === 'batch' || mode === 'chart') ? 20 : 25} minSize={15}>
              <div className="h-full flex flex-col">
                <div className="panel-header">Labeling</div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <LabelingPanel
                      chunk={activeDocument?.chunks.find(c => c.id === activeSelectedChunkId) || null}
                      currentLabel={activeAnnotation?.label}
                      currentReason={activeAnnotation?.removeReason}
                      currentStrategy={activeAnnotation?.condenseStrategy}
                      currentScope={activeAnnotation?.scope}
                      onAnnotate={(label, options) => {
                        if (activeSelectedChunkId) {
                          if (mode === 'chart') {
                            chartAnnotateChunk(activeSelectedChunkId, label, options);
                          } else {
                            annotateChunk(activeSelectedChunkId, label, options);
                          }
                        }
                      }}
                      onClear={() => {
                        if (activeSelectedChunkId) {
                          if (mode === 'chart') {
                            chartRemoveAnnotation(activeSelectedChunkId);
                          } else {
                            removeAnnotation(activeSelectedChunkId);
                          }
                        }
                      }}
                    />
                  </div>
                </ScrollArea>
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
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>
    </div>
  );
};

export default Index;
