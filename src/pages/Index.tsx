import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/clinical/Header';
import { InferenceMode } from '@/components/clinical/InferenceMode';
import { IntelligenceHub } from '@/components/intelligence/IntelligenceHub';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { useChartProcessor } from '@/hooks/useChartProcessor';
import { useTextHighlights } from '@/hooks/useTextHighlights';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Loader2 } from 'lucide-react';
import { ChunkAnnotation } from '@/types/clinical';
import { TrainingModePage, BatchModePage, ChartModePage } from '@/pages/modes';
import { AnnotationWorkspace } from '@/components/clinical/AnnotationWorkspace';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [mode, setMode] = useState<'training' | 'inference' | 'batch' | 'chart' | 'intelligence'>('training');
  const [learnedRules, setLearnedRules] = useState<ChunkAnnotation[]>([]);
  
  const documentStore = useDocumentStore(user?.id);
  const batchProcessor = useBatchProcessor(user?.id);
  const chartProcessor = useChartProcessor(user?.id);

  // Selected chunk for chart mode
  const [chartSelectedChunkId, setChartSelectedChunkId] = useState<string | null>(null);

  // Annotation view mode: 'chunks' (segment-based) or 'highlight' (free selection)
  const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');

  // Get active document ID for highlights
  const activeDocumentId = mode === 'batch' && batchProcessor.currentBatchDocument?.document
    ? batchProcessor.currentBatchDocument.document.id
    : mode === 'chart' && chartProcessor.currentDocument
    ? chartProcessor.currentDocument.id
    : documentStore.currentDocument?.id;

  const textHighlights = useTextHighlights(user?.id, activeDocumentId);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Load learned rules when switching to inference mode
  useEffect(() => {
    if (mode === 'inference' && user?.id) {
      documentStore.getLearnedRules().then(setLearnedRules);
    }
  }, [mode, user?.id, documentStore.getLearnedRules]);

  // Keyboard navigation for batch mode
  useNavigationShortcuts(
    {
      onPrev: batchProcessor.prevDocument,
      onNext: batchProcessor.nextDocument,
      onNextUnlabeled: () => {
        const nextUnlabeled = batchProcessor.batchQueue.findIndex((d, i) => 
          i > batchProcessor.currentBatchIndex && d.annotationCount === 0
        );
        if (nextUnlabeled !== -1) {
          batchProcessor.goToDocument(nextUnlabeled);
        }
      },
    },
    mode === 'batch'
  );

  // Keyboard navigation for chart mode
  useNavigationShortcuts(
    {
      onPrev: chartProcessor.prevNote,
      onNext: chartProcessor.nextNote,
      onNextUnlabeled: () => {
        const nextUnlabeled = chartProcessor.noteItems.findIndex((n, i) => 
          i > chartProcessor.currentIndex && n.annotationCount === 0
        );
        if (nextUnlabeled !== -1) {
          chartProcessor.goToNote(nextUnlabeled);
        }
      },
    },
    mode === 'chart' && chartProcessor.isLoaded
  );

  // Update annotation count when annotations change in batch mode
  useEffect(() => {
    if (mode === 'batch' && batchProcessor.currentBatchDocument?.document) {
      const annotationCount = batchProcessor.currentBatchDocument.document.annotations.length;
      batchProcessor.updateAnnotationCount(batchProcessor.currentBatchDocument.id, annotationCount);
    }
  }, [mode, batchProcessor.currentBatchDocument?.document?.annotations.length]);

  // Determine active document based on mode
  const activeDocument = mode === 'batch' && batchProcessor.currentBatchDocument?.document 
    ? batchProcessor.currentBatchDocument.document 
    : mode === 'chart' && chartProcessor.currentDocument
    ? chartProcessor.currentDocument
    : documentStore.currentDocument;

  // Get selected chunk ID and annotation based on mode
  const activeSelectedChunkId = mode === 'chart' ? chartSelectedChunkId : documentStore.selectedChunkId;
  const setActiveSelectedChunkId = mode === 'chart' ? setChartSelectedChunkId : documentStore.setSelectedChunkId;
  
  const activeAnnotation = activeSelectedChunkId 
    ? (mode === 'chart' ? chartProcessor.getAnnotation(activeSelectedChunkId) : documentStore.getAnnotation(activeSelectedChunkId))
    : undefined;

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Inference mode - separate layout
  if (mode === 'inference') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header mode={mode} onModeChange={setMode} user={user} onSignOut={signOut} />
        <main className="flex-1 overflow-hidden">
          <InferenceMode learnedAnnotations={learnedRules} />
        </main>
      </div>
    );
  }

  // Intelligence hub - separate layout
  if (mode === 'intelligence') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header mode={mode} onModeChange={setMode} user={user} onSignOut={signOut} />
        <main className="flex-1 overflow-hidden">
          <IntelligenceHub />
        </main>
      </div>
    );
  }

  // No document loaded - show upload/mode selection screens
  if (!activeDocument) {
    if (mode === 'training') {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <Header mode={mode} onModeChange={setMode} user={user} onSignOut={signOut} />
          <main className="flex-1 overflow-hidden">
            <TrainingModePage
              documents={documentStore.documents}
              docLoading={documentStore.loading}
              batchQueueLength={batchProcessor.batchQueue.length}
              chartNotesLength={chartProcessor.noteItems.length}
              chartIsLoaded={chartProcessor.isLoaded}
              onDocumentSubmit={documentStore.createDocument}
              onSelectDocument={documentStore.selectDocument}
              onSwitchToBatch={() => setMode('batch')}
              onSwitchToChart={() => setMode('chart')}
            />
          </main>
        </div>
      );
    }

    if (mode === 'batch' && !batchProcessor.currentBatchDocument?.document) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <Header mode={mode} onModeChange={setMode} user={user} onSignOut={signOut} />
          <main className="flex-1 overflow-hidden">
            <BatchModePage
              queue={batchProcessor.batchQueue}
              currentIndex={batchProcessor.currentBatchIndex}
              isProcessing={batchProcessor.isProcessing}
              stats={batchProcessor.stats}
              onBatchSubmit={batchProcessor.addToBatch}
              onGoToDocument={batchProcessor.goToDocument}
              onNext={batchProcessor.nextDocument}
              onPrev={batchProcessor.prevDocument}
              onStartProcessing={batchProcessor.startProcessing}
              onRemove={batchProcessor.removeFromBatch}
              onClear={batchProcessor.clearBatch}
              onBackToTraining={() => setMode('training')}
            />
          </main>
        </div>
      );
    }

    if (mode === 'chart' && !chartProcessor.isLoaded) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <Header mode={mode} onModeChange={setMode} user={user} onSignOut={signOut} />
          <main className="flex-1 overflow-hidden">
            <ChartModePage
              onChartSubmit={(patientId, notes) => chartProcessor.loadChart(patientId, notes)}
              onBackToTraining={() => setMode('training')}
            />
          </main>
        </div>
      );
    }
  }

  // Main annotation workspace with document loaded
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header mode={mode} onModeChange={setMode} user={user} onSignOut={signOut} />
      <main className="flex-1 overflow-hidden">
        <AnnotationWorkspace
          mode={mode}
          activeDocument={activeDocument}
          activeSelectedChunkId={activeSelectedChunkId}
          activeAnnotation={activeAnnotation}
          annotationView={annotationView}
          highlights={textHighlights.highlights}
          highlightStats={textHighlights.getStats()}
          // Batch mode props
          batchQueue={batchProcessor.batchQueue}
          currentBatchIndex={batchProcessor.currentBatchIndex}
          batchIsProcessing={batchProcessor.isProcessing}
          batchStats={batchProcessor.stats}
          // Chart mode props
          chartPatientId={chartProcessor.patientId}
          chartNoteItems={chartProcessor.noteItems}
          chartCurrentIndex={chartProcessor.currentIndex}
          // Callbacks
          onChunkSelect={setActiveSelectedChunkId}
          onAnnotationViewChange={setAnnotationView}
          onAnnotate={(chunkId, label, options) => {
            if (mode === 'chart') {
              chartProcessor.annotateChunk(chunkId, label, options);
            } else {
              documentStore.annotateChunk(chunkId, label, options);
            }
          }}
          onRemoveAnnotation={(chunkId) => {
            if (mode === 'chart') {
              chartProcessor.removeAnnotation(chunkId);
            } else {
              documentStore.removeAnnotation(chunkId);
            }
          }}
          onBulkAnnotate={mode === 'chart' ? chartProcessor.bulkAnnotateChunks : documentStore.bulkAnnotateChunks}
          onAddHighlight={textHighlights.addHighlight}
          onRemoveHighlight={textHighlights.removeHighlight}
          onUpdateHighlight={textHighlights.updateHighlight}
          onClearHighlights={textHighlights.clearHighlights}
          // Batch navigation
          onBatchGoToDocument={batchProcessor.goToDocument}
          onBatchNext={batchProcessor.nextDocument}
          onBatchPrev={batchProcessor.prevDocument}
          onBatchStartProcessing={batchProcessor.startProcessing}
          onBatchRemove={batchProcessor.removeFromBatch}
          onBatchClear={batchProcessor.clearBatch}
          // Chart navigation
          onChartGoToNote={chartProcessor.goToNote}
          onChartNext={chartProcessor.nextNote}
          onChartPrev={chartProcessor.prevNote}
          onChartClear={chartProcessor.clearChart}
          // Document actions
          onNewDocument={() => {
            setActiveSelectedChunkId(null);
            textHighlights.clearHighlights();
            if (mode === 'chart') {
              chartProcessor.clearChart();
            } else if (mode === 'batch') {
              setMode('training');
            } else {
              documentStore.selectDocument('');
            }
          }}
        />
      </main>
    </div>
  );
};

export default Index;
