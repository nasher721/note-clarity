import { useState } from 'react';
import { ClinicalDocument, ChunkAnnotation } from '@/types/clinical';
import { parseDocument } from '@/utils/chunkParser';
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

  const handleDocumentSubmit = (text: string, noteType?: string, service?: string) => {
    const chunks = parseDocument(text);
    
    // Apply learned rules
    const annotations: ChunkAnnotation[] = [];
    
    for (const chunk of chunks) {
      // Check for matching learned rules
      const globalRule = learnedAnnotations.find(
        a => a.scope === 'global' && 
        a.rawText.toLowerCase().trim() === chunk.text.toLowerCase().trim()
      );

      const noteTypeRule = noteType ? learnedAnnotations.find(
        a => a.scope === 'note_type' && 
        a.rawText.toLowerCase().trim() === chunk.text.toLowerCase().trim()
      ) : null;

      const rule = noteTypeRule || globalRule;

      if (rule) {
        annotations.push({
          ...rule,
          chunkId: chunk.id,
          rawText: chunk.text,
          timestamp: new Date(),
        });
      } else if (chunk.suggestedLabel) {
        // Apply heuristic suggestions
        annotations.push({
          chunkId: chunk.id,
          rawText: chunk.text,
          sectionType: chunk.type,
          label: chunk.suggestedLabel,
          scope: 'this_document',
          timestamp: new Date(),
          userId: 'system',
        });
      }
    }

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
  };

  const getExplanation = (chunkId: string) => {
    const annotation = appliedAnnotations.find(a => a.chunkId === chunkId);
    if (!annotation) return null;

    const matchingRule = learnedAnnotations.find(
      a => a.rawText.toLowerCase().trim() === annotation.rawText.toLowerCase().trim()
    );

    if (matchingRule) {
      return {
        source: 'learned_rule',
        scope: matchingRule.scope,
        reason: matchingRule.removeReason || matchingRule.condenseStrategy,
      };
    }

    return {
      source: 'heuristic',
      reason: 'Pattern-based detection',
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

  return (
    <div className="h-full grid grid-cols-3 divide-x">
      {/* Document with applied labels */}
      <div className="col-span-2 flex flex-col">
        <div className="panel-header flex items-center justify-between">
          <span>Processed Document</span>
          <div className="flex gap-2">
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
                      {selectedExplanation.source === 'learned_rule' ? 'Learned Rule' : 'Heuristic'}
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
                    onClick={() => setSelectedChunkId(a.chunkId)}
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
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
