import { useMemo, useState } from 'react';
import { ClinicalDocument, ChunkAnnotation } from '@/types/clinical';
import { parseDocument } from '@/utils/chunkParser';
import { buildModelAnnotations, ExtractedField, ModelExplanation } from '@/utils/inferenceModel';
import { DocumentUploader } from './DocumentUploader';
import { DiffPreview } from './DiffPreview';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wand2, 
  Info, 
  Check, 
  Scissors, 
  Trash2,
  Copy,
  Download
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface InferenceModeProps {
  learnedAnnotations: ChunkAnnotation[];
}

export function InferenceMode({ learnedAnnotations }: InferenceModeProps) {
  const [document, setDocument] = useState<ClinicalDocument | null>(null);
  const [appliedAnnotations, setAppliedAnnotations] = useState<ChunkAnnotation[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [modelExplanations, setModelExplanations] = useState<Record<string, ModelExplanation>>({});
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [fieldFilter, setFieldFilter] = useState<'all' | 'selected'>('all');

  const handleDocumentSubmit = async (text: string, noteType?: string, service?: string) => {
    const chunks = parseDocument(text);

    const { annotations, explanations, extractedFields: extracted } = await buildModelAnnotations({
      chunks,
      learnedAnnotations,
      noteType,
      service,
    });

    setDocument({
      id: Math.random().toString(36).substring(2, 11),
      originalText: text,
      chunks,
      annotations,
      createdAt: new Date(),
      noteType,
      service,
    });
    setAppliedAnnotations(annotations);
    setModelExplanations(explanations);
    setExtractedFields(extracted);
  };

  const handleReset = () => {
    setDocument(null);
    setAppliedAnnotations([]);
    setSelectedChunkId(null);
    setModelExplanations({});
    setExtractedFields([]);
    setFieldFilter('all');
  };

  const getExplanation = (chunkId: string) => {
    const annotation = appliedAnnotations.find(a => a.chunkId === chunkId);
    if (!annotation) return null;
    const explanation = modelExplanations[chunkId];
    if (!explanation) return null;

    return {
      ...explanation,
      scope: annotation.scope,
      detail: annotation.removeReason || annotation.condenseStrategy,
    };
  };

  const handleCopy = () => {
    if (!document) return;
    
    const cleanedText = document.chunks
      .filter(c => {
        const a = appliedAnnotations.find(ann => ann.chunkId === c.id);
        return !a || a.label !== 'REMOVE';
      })
      .map(c => {
        const a = appliedAnnotations.find(ann => ann.chunkId === c.id);
        if (a?.label === 'CONDENSE') {
          return `[Condensed: ${c.text.substring(0, 50)}...]`;
        }
        return c.text;
      })
      .join('\n\n');

    navigator.clipboard.writeText(cleanedText);
    toast({
      title: 'Copied to clipboard',
      description: 'Cleaned note has been copied.',
    });
  };

  if (!document) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-6 mb-6 bg-accent/30 border-accent">
          <div className="flex items-start gap-3">
            <Wand2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Inference Mode</h3>
              <p className="text-sm text-muted-foreground">
                Upload a new document to automatically apply learned rules and see the cleaned output.
                {learnedAnnotations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {learnedAnnotations.length} learned rules
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </Card>
        <DocumentUploader onDocumentSubmit={handleDocumentSubmit} />
      </div>
    );
  }

  const selectedChunk = document.chunks.find(c => c.id === selectedChunkId);
  const selectedExplanation = selectedChunkId ? getExplanation(selectedChunkId) : null;
  const displayedExtractedFields = useMemo(() => {
    if (fieldFilter === 'selected' && selectedChunkId) {
      return extractedFields.filter(field => field.sourceChunkId === selectedChunkId);
    }
    return extractedFields;
  }, [extractedFields, fieldFilter, selectedChunkId]);

  return (
    <div className="h-full grid grid-cols-3 divide-x">
      {/* Document with applied labels */}
      <div className="col-span-2 flex flex-col">
        <div className="panel-header flex items-center justify-between">
          <span>Processed Document</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              New Document
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <DiffPreview 
              chunks={document.chunks} 
              annotations={appliedAnnotations} 
            />
          </div>
        </ScrollArea>
      </div>

      {/* Explanation panel */}
      <div className="flex flex-col">
        <div className="panel-header">Explanation</div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {selectedChunk && selectedExplanation ? (
              <Card className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Why this was modified</span>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Chunk:</p>
                  <p className="text-sm font-mono line-clamp-3">{selectedChunk.text}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="outline">
                      {selectedExplanation.source.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {selectedExplanation.scope && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Scope:</span>
                      <Badge variant="secondary">{selectedExplanation.scope}</Badge>
                    </div>
                  )}
                  {selectedExplanation.reason && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <span>{String(selectedExplanation.reason).replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span>{Math.round(selectedExplanation.confidence * 100)}%</span>
                  </div>
                  {selectedExplanation.detail && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rule detail:</span>
                      <span>{String(selectedExplanation.detail).replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {selectedExplanation.signals && selectedExplanation.signals.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Signals:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {selectedExplanation.signals.map((signal, index) => (
                          <li key={index} className="text-xs text-muted-foreground">
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Click on any modified chunk to see why it was changed</p>
              </div>
            )}

            {/* Applied rules summary */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Applied Changes</h4>
              <div className="space-y-2">
                {appliedAnnotations.slice(0, 10).map((a, i) => (
                  <div 
                    key={i}
                    className="p-2 bg-muted rounded text-xs cursor-pointer hover:bg-muted/80"
                    onClick={() => {
                      setSelectedChunkId(a.chunkId);
                      setFieldFilter('selected');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {a.label === 'KEEP' && <Check className="h-3 w-3 text-label-keep" />}
                      {a.label === 'CONDENSE' && <Scissors className="h-3 w-3 text-label-condense" />}
                      {a.label === 'REMOVE' && <Trash2 className="h-3 w-3 text-label-remove" />}
                      <span className="truncate flex-1">{a.rawText.substring(0, 40)}...</span>
                    </div>
                  </div>
                ))}
                {appliedAnnotations.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{appliedAnnotations.length - 10} more changes
                  </p>
                )}
              </div>
            </div>

            {extractedFields.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold">Extracted Fields</h4>
                  <div className="flex gap-2">
                    <Button
                      variant={fieldFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFieldFilter('all')}
                    >
                      All Fields
                    </Button>
                    <Button
                      variant={fieldFilter === 'selected' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFieldFilter('selected')}
                      disabled={!selectedChunkId}
                    >
                      Selected Chunk
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Showing {displayedExtractedFields.length} of {extractedFields.length} extracted fields
                  {fieldFilter === 'selected' && selectedChunkId ? ' for the selected chunk.' : '.'}
                </p>
                <div className="space-y-2">
                  {displayedExtractedFields.slice(0, 8).map(field => (
                    <div key={field.id} className="rounded border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{field.label}</span>
                        <Badge variant="outline">{field.category.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{field.value}</p>
                    </div>
                  ))}
                  {displayedExtractedFields.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{displayedExtractedFields.length - 8} more extracted fields
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
