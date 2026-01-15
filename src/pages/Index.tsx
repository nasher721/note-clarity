import { useState } from 'react';
import { Header } from '@/components/clinical/Header';
import { DocumentUploader } from '@/components/clinical/DocumentUploader';
import { ChunkViewer } from '@/components/clinical/ChunkViewer';
import { LabelingPanel } from '@/components/clinical/LabelingPanel';
import { DiffPreview } from '@/components/clinical/DiffPreview';
import { InferenceMode } from '@/components/clinical/InferenceMode';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';

const Index = () => {
  const [mode, setMode] = useState<'training' | 'inference'>('training');
  const {
    currentDocument,
    selectedChunkId,
    setSelectedChunkId,
    createDocument,
    annotateChunk,
    removeAnnotation,
    getAnnotation,
  } = useDocumentStore();

  const selectedChunk = currentDocument?.chunks.find(c => c.id === selectedChunkId);
  const currentAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;

  // Collect all global/note_type annotations for inference
  const learnedAnnotations = currentDocument?.annotations.filter(
    a => a.scope === 'global' || a.scope === 'note_type' || a.scope === 'service'
  ) || [];

  if (mode === 'inference') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header mode={mode} onModeChange={setMode} />
        <main className="flex-1 overflow-hidden">
          <InferenceMode learnedAnnotations={learnedAnnotations} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header mode={mode} onModeChange={setMode} />
      
      <main className="flex-1 overflow-hidden">
        {!currentDocument ? (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6 p-4 bg-accent/30 rounded-lg border border-accent">
              <h2 className="font-semibold mb-2">Training Mode</h2>
              <p className="text-sm text-muted-foreground">
                Upload a clinical document to begin labeling chunks. Your annotations will be used 
                to train rules that can automatically clean future documents.
              </p>
            </div>
            <DocumentUploader onDocumentSubmit={createDocument} />
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Document chunks panel */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="panel-header">
                  Document Chunks
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({currentDocument.chunks.length} segments)
                  </span>
                </div>
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
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Labeling panel */}
            <ResizablePanel defaultSize={25} minSize={20}>
              <div className="h-full flex flex-col">
                <div className="panel-header">Labeling</div>
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <LabelingPanel
                      chunk={selectedChunk || null}
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
            <ResizablePanel defaultSize={40} minSize={25}>
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
        )}
      </main>
    </div>
  );
};

export default Index;
