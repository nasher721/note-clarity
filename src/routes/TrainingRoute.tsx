
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrainingModePage } from '@/pages/modes';
import { AnnotationWorkspace } from '@/components/clinical/AnnotationWorkspace';
import { useDocumentContext } from '@/contexts/DocumentContext';
import { useAnnotations } from '@/hooks/documents';
import { useTextHighlights } from '@/hooks/useTextHighlights';
import { useAnnotationHistory, AnnotationActionData } from '@/hooks/useUndoRedo';
import { useAuth } from '@/hooks/useAuth';
import { ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope } from '@/types/clinical';
import { toast } from '@/hooks/use-toast';
import { useLearnedRules } from '@/hooks/documents/useLearnedRules';
import { useCopilot } from '@/hooks/useCopilot';
import { useSettings } from '@/contexts/SettingsContext';

// ... existing imports

export function TrainingRoute() {
    const { user } = useAuth();
    // ... existing document context
    const {
        documents,
        currentDocument,
        loading: docLoading,
        createDocument,
        selectDocument,
        updateDocumentInList
    } = useDocumentContext();

    // ... existing state

    // Load learned rules for Copilot
    const { getLearnedRules } = useLearnedRules(user?.id);
    const [learnedRules, setLearnedRules] = useState<ChunkAnnotation[]>([]);

    useEffect(() => {
        getLearnedRules().then(setLearnedRules);
    }, [getLearnedRules]);

    // Initialize Copilot
    const { copilotEnabled } = useSettings();
    const { suggestions } = useCopilot({
        document: currentDocument,
        learnedRules,
        isEnabled: copilotEnabled,
    });

    // ... rest of component
    // ... rest of component

    const navigate = useNavigate();
    const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
    const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');

    // Hooks specifically for Training Mode
    const { annotateChunk, bulkAnnotateChunks, removeAnnotation, getAnnotation } = useAnnotations(
        user?.id,
        currentDocument,
        updateDocumentInList
    );

    const textHighlights = useTextHighlights(user?.id, currentDocument?.id);
    const annotationHistory = useAnnotationHistory();

    const handleSelectDocument = useCallback((docId: string) => {
        selectDocument(docId);
        setSelectedChunkId(null);
    }, [selectDocument]);

    const activeAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;

    // -- Annotation Handlers (similar to Index.tsx but focused) --

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
        const currentAnnotation = getAnnotation(chunkId);

        // Save to history
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

        annotateChunk(chunkId, label, options);
    }, [annotateChunk, getAnnotation, annotationHistory]);

    const handleRemoveAnnotation = useCallback((chunkId: string) => {
        const currentAnnotation = getAnnotation(chunkId);
        if (currentAnnotation) {
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
        removeAnnotation(chunkId);
    }, [removeAnnotation, getAnnotation, annotationHistory]);

    const handleBulkAnnotate = useCallback(async (
        chunkIds: string[],
        label: PrimaryLabel,
        options?: {
            removeReason?: RemoveReason;
            condenseStrategy?: CondenseStrategy;
            scope?: LabelScope;
        }
    ) => {
        annotationHistory.pushAction({
            type: 'annotation',
            data: {
                type: 'bulk_add',
                chunkIds,
                newLabel: label,
                newOptions: options,
            },
        });
        await bulkAnnotateChunks(chunkIds, label, options || {});
    }, [bulkAnnotateChunks, annotationHistory]);

    const handleClearAllAnnotations = useCallback(() => {
        if (!currentDocument) return;
        const annotatedChunkIds = currentDocument.annotations.map(a => a.chunkId);
        if (annotatedChunkIds.length === 0) return;

        annotationHistory.pushAction({
            type: 'annotation',
            data: {
                type: 'bulk_add',
                chunkIds: annotatedChunkIds,
                previousLabel: 'CLEAR_ALL',
                newLabel: undefined,
            },
        });

        for (const chunkId of annotatedChunkIds) {
            removeAnnotation(chunkId);
        }
        toast({ title: 'Cleared all labels', description: `Removed ${annotatedChunkIds.length} labels` });
    }, [currentDocument, removeAnnotation, annotationHistory]);


    // -- Undo/Redo Handlers --
    const handleUndo = useCallback(() => {
        const action = annotationHistory.undo();
        if (!action) return;
        const data = action.data as AnnotationActionData;

        if (data.type === 'add') {
            if (data.chunkId) removeAnnotation(data.chunkId);
        } else if (data.type === 'remove' || data.type === 'update') {
            if (data.chunkId && data.previousLabel) {
                annotateChunk(data.chunkId, data.previousLabel as PrimaryLabel, (data.previousOptions as any) || {});
            }
        } else if (data.type === 'bulk_add' && data.chunkIds) {
            for (const chunkId of data.chunkIds) removeAnnotation(chunkId);
        }
        toast({ title: 'Undo', description: 'Action undone', duration: 1500 });
    }, [annotationHistory, removeAnnotation, annotateChunk]);

    const handleRedo = useCallback(() => {
        const action = annotationHistory.redo();
        if (!action) return;
        const data = action.data as AnnotationActionData;

        if (data.type === 'add' || data.type === 'update') {
            if (data.chunkId && data.newLabel) {
                annotateChunk(data.chunkId, data.newLabel as PrimaryLabel, (data.newOptions as any) || {});
            }
        } else if (data.type === 'remove') {
            if (data.chunkId) removeAnnotation(data.chunkId);
        } else if (data.type === 'bulk_add' && data.chunkIds && data.newLabel) {
            bulkAnnotateChunks(data.chunkIds, data.newLabel as PrimaryLabel, (data.newOptions as any) || {});
        }
        toast({ title: 'Redo', description: 'Action redone', duration: 1500 });
    }, [annotationHistory, removeAnnotation, annotateChunk, bulkAnnotateChunks]);


    if (!currentDocument) {
        return (
            <TrainingModePage
                documents={documents}
                docLoading={docLoading}
                batchQueueLength={0} // Not relevant here
                chartNotesLength={0}
                chartIsLoaded={false}
                onDocumentSubmit={createDocument}
                onSelectDocument={handleSelectDocument}
                onSwitchToBatch={() => navigate('/workspace/batch')}
                onSwitchToChart={() => navigate('/workspace/chart')}
            />
        );
    }

    return (
        <AnnotationWorkspace
            mode="training"
            activeDocument={currentDocument}
            activeSelectedChunkId={selectedChunkId}
            activeAnnotation={activeAnnotation}
            annotationView={annotationView}
            highlights={textHighlights.highlights}
            highlightStats={textHighlights.getStats()}
            // Dummy values for other modes
            batchQueue={[]}
            currentBatchIndex={0}
            batchIsProcessing={false}
            batchStats={{ total: 0, pending: 0, processing: 0, completed: 0, totalAnnotations: 0 }}
            chartPatientId={null}
            chartNoteItems={[]}
            chartCurrentIndex={0}
            // Callbacks
            onChunkSelect={setSelectedChunkId}
            onAnnotationViewChange={setAnnotationView}
            onAnnotate={handleAnnotate}
            onRemoveAnnotation={handleRemoveAnnotation}

            // Copilot props
            suggestions={suggestions}
            onAcceptSuggestion={(chunkId, suggestion) => {
                handleAnnotate(chunkId, suggestion.annotation.label, {
                    removeReason: suggestion.annotation.removeReason,
                    condenseStrategy: suggestion.annotation.condenseStrategy,
                    scope: suggestion.annotation.scope,
                    overrideJustification: `Copilot accepted: ${suggestion.explanation.reason}`
                });
            }}

            onClearAllAnnotations={handleClearAllAnnotations}
            onBulkAnnotate={handleBulkAnnotate}
            onAddHighlight={textHighlights.addHighlight}
            onRemoveHighlight={textHighlights.removeHighlight}
            onUpdateHighlight={textHighlights.updateHighlight}
            onClearHighlights={textHighlights.clearHighlights}
            // Nav stubs
            onBatchGoToDocument={() => { }}
            onBatchNext={() => { }}
            onBatchPrev={() => { }}
            onBatchStartProcessing={() => { }}
            onBatchRemove={() => { }}
            onBatchClear={() => { }}
            onChartGoToNote={() => { }}
            onChartNext={() => { }}
            onChartPrev={() => { }}
            onChartClear={() => { }}

            onNewDocument={() => {
                setSelectedChunkId(null);
                textHighlights.clearHighlights();
                annotationHistory.clear();
                selectDocument('');
            }}

            canUndo={annotationHistory.canUndo}
            canRedo={annotationHistory.canRedo}
            undoCount={annotationHistory.stats.undoCount}
            redoCount={annotationHistory.stats.redoCount}
            onUndo={handleUndo}
            onRedo={handleRedo}
        />
    );
}
