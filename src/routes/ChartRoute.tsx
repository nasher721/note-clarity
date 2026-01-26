
import { useState, useCallback, useEffect } from 'react';
import { ChartModePage } from '@/pages/modes';
import { AnnotationWorkspace } from '@/components/clinical/AnnotationWorkspace';
import { useChartProcessor } from '@/hooks/useChartProcessor';
import { useAuth } from '@/hooks/useAuth';
import { useTextHighlights } from '@/hooks/useTextHighlights';
import { useAnnotationHistory, AnnotationActionData } from '@/hooks/useUndoRedo';
import { ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, LabelScope } from '@/types/clinical';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useNavigationShortcuts } from '@/hooks/useKeyboardShortcuts';

export function ChartRoute() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const chartProcessor = useChartProcessor(user?.id);

    const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
    const [annotationView, setAnnotationView] = useState<'chunks' | 'highlight'>('chunks');

    // Chart processor handles logic differently: it has `currentDocument`
    const activeDocument = chartProcessor.currentDocument;

    const textHighlights = useTextHighlights(user?.id, activeDocument?.id);
    const annotationHistory = useAnnotationHistory();

    // Reset selection when doc changes
    useEffect(() => {
        setSelectedChunkId(null);
    }, [activeDocument?.id]);

    // Keyboard navigation
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
        chartProcessor.isLoaded
    );

    const activeAnnotation = selectedChunkId ? chartProcessor.getAnnotation(selectedChunkId) : undefined;

    // Chart Processor has its own annotate methods `chartProcessor.annotateChunk`!
    // This is different from Batch/Training which use `useAnnotations`.

    const handleAnnotate = useCallback((chunkId: string, label: PrimaryLabel, options: any) => {
        const currentAnnotation = chartProcessor.getAnnotation(chunkId);
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
            }
        });
        chartProcessor.annotateChunk(chunkId, label, options);
    }, [chartProcessor, annotationHistory]);

    const handleRemoveAnnotation = useCallback((chunkId: string) => {
        const currentAnnotation = chartProcessor.getAnnotation(chunkId);
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
                    }
                }
            });
        }
        chartProcessor.removeAnnotation(chunkId);
    }, [chartProcessor, annotationHistory]);

    const handleBulkAnnotate = useCallback(async (chunkIds: string[], label: PrimaryLabel, options: any) => {
        annotationHistory.pushAction({
            type: 'annotation',
            data: {
                type: 'bulk_add',
                chunkIds,
                newLabel: label,
                newOptions: options,
            }
        });
        await chartProcessor.bulkAnnotateChunks(chunkIds, label, options || {});
    }, [chartProcessor, annotationHistory]);

    const handleClearAllAnnotations = useCallback(() => {
        if (!activeDocument) return;
        const annotatedChunkIds = activeDocument.annotations.map(a => a.chunkId);
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
            chartProcessor.removeAnnotation(chunkId);
        }
        toast({ title: 'Cleared all labels', description: `Removed ${annotatedChunkIds.length} labels` });
    }, [activeDocument, chartProcessor, annotationHistory]);

    // Undo/Redo - using chartProcessor methods
    const handleUndo = useCallback(() => {
        const action = annotationHistory.undo();
        if (!action) return;
        const data = action.data as AnnotationActionData;

        if (data.type === 'add') {
            if (data.chunkId) chartProcessor.removeAnnotation(data.chunkId);
        } else if (data.type === 'remove' || data.type === 'update') {
            if (data.chunkId && data.previousLabel) {
                chartProcessor.annotateChunk(data.chunkId, data.previousLabel as PrimaryLabel, (data.previousOptions as any) || {});
            }
        } else if (data.type === 'bulk_add' && data.chunkIds) {
            for (const chunkId of data.chunkIds) chartProcessor.removeAnnotation(chunkId);
        }
        toast({ title: 'Undo', description: 'Action undone', duration: 1500 });
    }, [annotationHistory, chartProcessor]);

    const handleRedo = useCallback(() => {
        const action = annotationHistory.redo();
        if (!action) return;
        const data = action.data as AnnotationActionData;

        if (data.type === 'add' || data.type === 'update') {
            if (data.chunkId && data.newLabel) {
                chartProcessor.annotateChunk(data.chunkId, data.newLabel as PrimaryLabel, (data.newOptions as any) || {});
            }
        } else if (data.type === 'remove') {
            if (data.chunkId) chartProcessor.removeAnnotation(data.chunkId);
        } else if (data.type === 'bulk_add' && data.chunkIds && data.newLabel) {
            chartProcessor.bulkAnnotateChunks(data.chunkIds, data.newLabel as PrimaryLabel, (data.newOptions as any) || {});
        }
        toast({ title: 'Redo', description: 'Action redone', duration: 1500 });
    }, [annotationHistory, chartProcessor]);


    if (!chartProcessor.isLoaded) {
        return (
            <ChartModePage
                onChartSubmit={(patientId, notes) => chartProcessor.loadChart(patientId, notes)}
                onBackToTraining={() => navigate('/workspace/training')}
            />
        );
    }

    return (
        <AnnotationWorkspace
            mode="chart"
            activeDocument={activeDocument}
            activeSelectedChunkId={selectedChunkId}
            activeAnnotation={activeAnnotation}
            annotationView={annotationView}
            highlights={textHighlights.highlights}
            highlightStats={textHighlights.getStats()}

            batchQueue={[]}
            currentBatchIndex={0}
            batchIsProcessing={false}
            batchStats={{ total: 0, pending: 0, processing: 0, completed: 0, totalAnnotations: 0 }}

            chartPatientId={chartProcessor.patientId}
            chartNoteItems={chartProcessor.noteItems}
            chartCurrentIndex={chartProcessor.currentIndex}

            onChunkSelect={setSelectedChunkId}
            onAnnotationViewChange={setAnnotationView}
            onAnnotate={handleAnnotate}
            onRemoveAnnotation={handleRemoveAnnotation}
            onClearAllAnnotations={handleClearAllAnnotations}
            onBulkAnnotate={handleBulkAnnotate}
            onAddHighlight={textHighlights.addHighlight}
            onRemoveHighlight={textHighlights.removeHighlight}
            onUpdateHighlight={textHighlights.updateHighlight}
            onClearHighlights={textHighlights.clearHighlights}

            onBatchGoToDocument={() => { }}
            onBatchNext={() => { }}
            onBatchPrev={() => { }}
            onBatchStartProcessing={() => { }}
            onBatchRemove={() => { }}
            onBatchClear={() => { }}

            onChartGoToNote={chartProcessor.goToNote}
            onChartNext={chartProcessor.nextNote}
            onChartPrev={chartProcessor.prevNote}
            onChartClear={chartProcessor.clearChart}

            onNewDocument={() => {
                chartProcessor.clearChart();
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
