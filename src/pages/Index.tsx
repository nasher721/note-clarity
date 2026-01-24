import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/clinical/Header';
import { InferenceMode } from '@/components/clinical/InferenceMode';
import { IntelligenceHub } from '@/components/intelligence/IntelligenceHub';
import { useDocuments, useDocumentCreate, useAnnotations, useLearnedRules, useCleanedText } from '@/hooks/documents';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { useChartProcessor } from '@/hooks/useChartProcessor';
import { useTextHighlights } from '@/hooks/useTextHighlights';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationShortcuts, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAnnotationHistory, AnnotationActionData } from '@/hooks/useUndoRedo';
import { Loader2 } from 'lucide-react';
import { ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope } from '@/types/clinical';
import { TrainingModePage, BatchModePage, ChartModePage } from '@/pages/modes';
import { AnnotationWorkspace } from '@/components/clinical/AnnotationWorkspace';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [mode, setMode] = useState<'training' | 'inference' | 'batch' | 'chart' | 'intelligence'>('training');
  const [learnedRulesState, setLearnedRulesState] = useState<ChunkAnnotation[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  
  // Use focused document hooks
  const {
    documents,
    currentDocument,
    loading: docLoading,
    selectDocument,
    updateDocumentInList,
    addDocumentToList,
  } = useDocuments(user?.id);
  
  const { createDocument } = useDocumentCreate(user?.id, addDocumentToList);
  const { annotateChunk, bulkAnnotateChunks, removeAnnotation, getAnnotation } = useAnnotations(
    user?.id,
    currentDocument,
    updateDocumentInList
  );
  const { getLearnedRules } = useLearnedRules(user?.id);
  const { getCleanedText } = useCleanedText(currentDocument);

  const batchProcessor = useBatchProcessor(user?.id);
  const chartProcessor = useChartProcessor(user?.id);
  
  // Undo/Redo history for annotations
  const annotationHistory = useAnnotationHistory();

  // Wrap selectDocument to also reset selected chunk
  const handleSelectDocument = useCallback((docId: string) => {
    selectDocument(docId);
    setSelectedChunkId(null);
  }, [selectDocument]);

  // Selected chunk for chart mode
  const [chartSelectedChunkId, setChartSelectedChunkId] = useState<string | null>(null);

  // Annotation view mode: 'chunks' (segment-based) or 'highlight' (free selection)
  const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');

  // Get active document ID for highlights
  const activeDocumentId = mode === 'batch' && batchProcessor.currentBatchDocument?.document
    ? batchProcessor.currentBatchDocument.document.id
    : mode === 'chart' && chartProcessor.currentDocument
    ? chartProcessor.currentDocument.id
    : currentDocument?.id;

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
      getLearnedRules().then(setLearnedRulesState);
    }
  }, [mode, user?.id, getLearnedRules]);

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
    : currentDocument;

  // Get selected chunk ID and annotation based on mode
  const activeSelectedChunkId = mode === 'chart' ? chartSelectedChunkId : selectedChunkId;
  const setActiveSelectedChunkId = mode === 'chart' ? setChartSelectedChunkId : setSelectedChunkId;
  
  const activeAnnotation = activeSelectedChunkId 
    ? (mode === 'chart' ? chartProcessor.getAnnotation(activeSelectedChunkId) : getAnnotation(activeSelectedChunkId))
    : undefined;

  // Handle annotation with history tracking
  const handleAnnotate = useCallback((
    chunkId: string,
    label: PrimaryLabel,
    options: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
      overrideJustification?: string;
    }
  ) => {
    const currentAnnotation = mode === 'chart' 
      ? chartProcessor.getAnnotation(chunkId) 
      : getAnnotation(chunkId);

    // Save to history before making changes
    annotationHistory.pushAction({
      type: 'annotation',
      data: {
        type: currentAnnotation ? 'update' : 'add',
        chunkId,
        previousLabel: currentAnnotation?.label ?? null,
        newLabel: label,
        previousOptions: currentAnnotation ? {
          removeReason: currentAnnotation.removeReason,
          condenseStrategy: currentAnnotation.condenseStrategy,
          scope: currentAnnotation.scope,
        } : undefined,
        newOptions: options,
      },
    });

    if (mode === 'chart') {
      chartProcessor.annotateChunk(chunkId, label, options);
    } else {
      annotateChunk(chunkId, label, options);
    }
  }, [mode, chartProcessor, annotateChunk, getAnnotation, annotationHistory]);

  // Handle remove annotation with history tracking
  const handleRemoveAnnotation = useCallback((chunkId: string) => {
    const currentAnnotation = mode === 'chart' 
      ? chartProcessor.getAnnotation(chunkId) 
      : getAnnotation(chunkId);

    if (currentAnnotation) {
      // Save to history before removing
      annotationHistory.pushAction({
        type: 'annotation',
        data: {
          type: 'remove',
          chunkId,
          previousLabel: currentAnnotation.label,
          newLabel: undefined,
          previousOptions: {
            removeReason: currentAnnotation.removeReason,
            condenseStrategy: currentAnnotation.condenseStrategy,
            scope: currentAnnotation.scope,
          },
        },
      });
    }

    if (mode === 'chart') {
      chartProcessor.removeAnnotation(chunkId);
    } else {
      removeAnnotation(chunkId);
    }
  }, [mode, chartProcessor, removeAnnotation, getAnnotation, annotationHistory]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const action = annotationHistory.undo();
    if (!action) return;

    const data = action.data as AnnotationActionData;
    
    if (data.type === 'add') {
      // Undo add = remove the annotation
      if (data.chunkId) {
        if (mode === 'chart') {
          chartProcessor.removeAnnotation(data.chunkId);
        } else {
          removeAnnotation(data.chunkId);
        }
      }
    } else if (data.type === 'remove' || data.type === 'update') {
      // Undo remove/update = restore previous state
      if (data.chunkId && data.previousLabel) {
        const prevOptions = data.previousOptions as {
          removeReason?: RemoveReason;
          condenseStrategy?: CondenseStrategy;
          scope?: LabelScope;
        } | undefined;
        
        if (mode === 'chart') {
          chartProcessor.annotateChunk(data.chunkId, data.previousLabel as PrimaryLabel, prevOptions || {});
        } else {
          annotateChunk(data.chunkId, data.previousLabel as PrimaryLabel, prevOptions || {});
        }
      }
    } else if (data.type === 'bulk_add' && data.chunkIds) {
      // Undo bulk add = remove all
      for (const chunkId of data.chunkIds) {
        if (mode === 'chart') {
          chartProcessor.removeAnnotation(chunkId);
        } else {
          removeAnnotation(chunkId);
        }
      }
    }

    toast({
      title: 'Undo',
      description: 'Action undone',
      duration: 1500,
    });
  }, [annotationHistory, mode, chartProcessor, removeAnnotation, annotateChunk]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const action = annotationHistory.redo();
    if (!action) return;

    const data = action.data as AnnotationActionData;
    
    if (data.type === 'add' || data.type === 'update') {
      // Redo add/update = apply the new label
      if (data.chunkId && data.newLabel) {
        const newOptions = data.newOptions as {
          removeReason?: RemoveReason;
          condenseStrategy?: CondenseStrategy;
          scope?: LabelScope;
        } | undefined;
        
        if (mode === 'chart') {
          chartProcessor.annotateChunk(data.chunkId, data.newLabel as PrimaryLabel, newOptions || {});
        } else {
          annotateChunk(data.chunkId, data.newLabel as PrimaryLabel, newOptions || {});
        }
      }
    } else if (data.type === 'remove') {
      // Redo remove = remove again
      if (data.chunkId) {
        if (mode === 'chart') {
          chartProcessor.removeAnnotation(data.chunkId);
        } else {
          removeAnnotation(data.chunkId);
        }
      }
    } else if (data.type === 'bulk_add' && data.chunkIds && data.newLabel) {
      // Redo bulk add = apply to all again
      const newOptions = data.newOptions as {
        removeReason?: RemoveReason;
        condenseStrategy?: CondenseStrategy;
        scope?: LabelScope;
      } | undefined;
      
      if (mode === 'chart') {
        chartProcessor.bulkAnnotateChunks(data.chunkIds, data.newLabel as PrimaryLabel, newOptions || {});
      } else {
        bulkAnnotateChunks(data.chunkIds, data.newLabel as PrimaryLabel, newOptions || {});
      }
    }

    toast({
      title: 'Redo',
      description: 'Action redone',
      duration: 1500,
    });
  }, [annotationHistory, mode, chartProcessor, removeAnnotation, annotateChunk, bulkAnnotateChunks]);

  // Handle bulk annotate with history tracking
  const handleBulkAnnotate = useCallback(async (
    chunkIds: string[],
    label: PrimaryLabel,
    options?: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
    }
  ) => {
    // Save to history before making changes
    annotationHistory.pushAction({
      type: 'annotation',
      data: {
        type: 'bulk_add',
        chunkIds,
        newLabel: label,
        newOptions: options,
      },
    });

    if (mode === 'chart') {
      await chartProcessor.bulkAnnotateChunks(chunkIds, label, options || {});
    } else {
      await bulkAnnotateChunks(chunkIds, label, options || {});
    }
  }, [mode, chartProcessor, bulkAnnotateChunks, annotationHistory]);

  // Keyboard shortcuts for undo/redo
  useKeyboardShortcuts([
    { 
      key: 'z', 
      handler: () => {
        // Check for Ctrl/Cmd + Z
        // This is a simplified check - the actual modifier check happens in the event
      },
      caseInsensitive: true,
      description: 'Undo' 
    },
  ], { enabled: false }); // Disabled - using native event listener instead

  // Use native event listener for proper modifier key detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in form fields
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (modifierKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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
          <InferenceMode learnedAnnotations={learnedRulesState} />
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
              documents={documents}
              docLoading={docLoading}
              batchQueueLength={batchProcessor.batchQueue.length}
              chartNotesLength={chartProcessor.noteItems.length}
              chartIsLoaded={chartProcessor.isLoaded}
              onDocumentSubmit={createDocument}
              onSelectDocument={handleSelectDocument}
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
          onAnnotate={handleAnnotate}
          onRemoveAnnotation={handleRemoveAnnotation}
          onBulkAnnotate={handleBulkAnnotate}
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
            annotationHistory.clear();
            if (mode === 'chart') {
              chartProcessor.clearChart();
            } else if (mode === 'batch') {
              setMode('training');
            } else {
              handleSelectDocument('');
            }
          }}
          // Undo/Redo
          canUndo={annotationHistory.canUndo}
          canRedo={annotationHistory.canRedo}
          undoCount={annotationHistory.stats.undoCount}
          redoCount={annotationHistory.stats.redoCount}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </main>
    </div>
  );
};

export default Index;
