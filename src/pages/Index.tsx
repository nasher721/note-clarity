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
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { ChunkAnnotation } from '@/types/clinical';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [mode, setMode] = useState<'training' | 'inference'>('training');
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

  const selectedChunk = currentDocument?.chunks.find(c => c.id === selectedChunkId);
  const currentAnnotation = selectedChunkId ? getAnnotation(selectedChunkId) : undefined;

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
        {!currentDocument ? (
          <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6 p-4 bg-accent/30 rounded-lg border border-accent">
              <h2 className="font-semibold mb-2">Training Mode</h2>
              <p className="text-sm text-muted-foreground">
                Upload a clinical document to begin labeling chunks. Your annotations are saved 
                to the cloud and used to train rules that can automatically clean future documents.
              </p>
            </div>
            
            <DocumentUploader onDocumentSubmit={createDocument} />
            
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
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Document chunks panel */}
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="panel-header flex items-center justify-between gap-2">
                  <span>
                    Document Chunks
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({currentDocument.chunks.length} segments)
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <BulkActions
                      chunks={currentDocument.chunks}
                      annotations={currentDocument.annotations}
                      onBulkAnnotate={bulkAnnotateChunks}
                    />
                    <button 
                      onClick={() => {
                        setSelectedChunkId(null);
                        selectDocument('');
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      New
                    </button>
                  </div>
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
