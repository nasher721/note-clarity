import { useMemo, useState, useCallback } from 'react';
import { ClinicalDocument, ChunkAnnotation, PrimaryLabel, RemoveReason, CondenseStrategy, REMOVE_REASON_LABELS, CONDENSE_STRATEGY_LABELS } from '@/types/clinical';
import { parseDocument } from '@/utils/chunkParser';
import { buildModelAnnotations, ExtractedField, ModelExplanation, getInferenceStats, PatternRule } from '@/utils/inferenceModel';
import { DocumentUploader } from './DocumentUploader';
import { DiffPreview } from './DiffPreview';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wand2,
  Info,
  Check,
  Scissors,
  Trash2,
  Copy,
  Download,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Brain,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

interface InferenceModeProps {
  learnedAnnotations: ChunkAnnotation[];
  patternRules?: PatternRule[];
  userId?: string;
  onAcceptPrediction?: (annotation: ChunkAnnotation, explanation: ModelExplanation) => void;
  onRejectPrediction?: (
    annotation: ChunkAnnotation,
    explanation: ModelExplanation,
    correctedLabel: PrimaryLabel,
    correctedRemoveReason?: RemoveReason,
    correctedCondenseStrategy?: CondenseStrategy
  ) => void;
}

interface FeedbackState {
  [chunkId: string]: 'accepted' | 'rejected' | 'pending';
}

export function InferenceMode({
  learnedAnnotations,
  patternRules,
  userId,
  onAcceptPrediction,
  onRejectPrediction,
}: InferenceModeProps) {
  const [document, setDocument] = useState<ClinicalDocument | null>(null);
  const [appliedAnnotations, setAppliedAnnotations] = useState<ChunkAnnotation[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [modelExplanations, setModelExplanations] = useState<Record<string, ModelExplanation>>({});
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [fieldFilter, setFieldFilter] = useState<'all' | 'selected'>('all');
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Correction state for rejection
  const [showCorrectionUI, setShowCorrectionUI] = useState(false);
  const [correctionLabel, setCorrectionLabel] = useState<PrimaryLabel | null>(null);
  const [correctionRemoveReason, setCorrectionRemoveReason] = useState<RemoveReason | undefined>();
  const [correctionCondenseStrategy, setCorrectionCondenseStrategy] = useState<CondenseStrategy | undefined>();

  const handleDocumentSubmit = async (text: string, noteType?: string, service?: string) => {
    setIsProcessing(true);
    try {
      const chunks = parseDocument(text);

      const { annotations, explanations, extractedFields: extracted } = await buildModelAnnotations({
        chunks,
        learnedAnnotations,
        noteType,
        service,
        patternRules,
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
      setFeedbackState({});
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setDocument(null);
    setAppliedAnnotations([]);
    setSelectedChunkId(null);
    setModelExplanations({});
    setExtractedFields([]);
    setFieldFilter('all');
    setFeedbackState({});
    setShowCorrectionUI(false);
    setCorrectionLabel(null);
  };

  const getExplanation = (chunkId: string) => {
    const annotation = appliedAnnotations.find(a => a.chunkId === chunkId);
    if (!annotation) return null;
    const explanation = modelExplanations[chunkId];
    if (!explanation) return null;

    return {
      ...explanation,
      annotation,
      scope: annotation.scope,
      detail: annotation.removeReason || annotation.condenseStrategy,
    };
  };

  const handleAccept = useCallback((chunkId: string) => {
    const annotation = appliedAnnotations.find(a => a.chunkId === chunkId);
    const explanation = modelExplanations[chunkId];

    if (annotation && explanation && onAcceptPrediction) {
      onAcceptPrediction(annotation, explanation);
    }

    setFeedbackState(prev => ({ ...prev, [chunkId]: 'accepted' }));
    toast({
      title: 'Prediction accepted',
      description: 'This will help improve future predictions.',
    });
  }, [appliedAnnotations, modelExplanations, onAcceptPrediction]);

  const handleReject = useCallback(() => {
    if (!selectedChunkId || !correctionLabel) return;

    const annotation = appliedAnnotations.find(a => a.chunkId === selectedChunkId);
    const explanation = modelExplanations[selectedChunkId];

    if (annotation && explanation && onRejectPrediction) {
      onRejectPrediction(
        annotation,
        explanation,
        correctionLabel,
        correctionRemoveReason,
        correctionCondenseStrategy
      );
    }

    setFeedbackState(prev => ({ ...prev, [selectedChunkId]: 'rejected' }));
    setShowCorrectionUI(false);
    setCorrectionLabel(null);
    setCorrectionRemoveReason(undefined);
    setCorrectionCondenseStrategy(undefined);

    toast({
      title: 'Correction recorded',
      description: 'Your feedback will improve the model.',
    });
  }, [selectedChunkId, correctionLabel, correctionRemoveReason, correctionCondenseStrategy, appliedAnnotations, modelExplanations, onRejectPrediction]);

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

  // Statistics
  const stats = useMemo(() => {
    if (appliedAnnotations.length === 0) return null;
    return getInferenceStats(appliedAnnotations, modelExplanations);
  }, [appliedAnnotations, modelExplanations]);

  const feedbackStats = useMemo(() => {
    const accepted = Object.values(feedbackState).filter(v => v === 'accepted').length;
    const rejected = Object.values(feedbackState).filter(v => v === 'rejected').length;
    const pending = appliedAnnotations.length - accepted - rejected;
    return { accepted, rejected, pending };
  }, [feedbackState, appliedAnnotations.length]);

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
              </p>
              <div className="flex gap-2 mt-2">
                {learnedAnnotations.length > 0 && (
                  <Badge variant="secondary">
                    <Brain className="h-3 w-3 mr-1" />
                    {learnedAnnotations.length} learned rules
                  </Badge>
                )}
                {patternRules && patternRules.length > 0 && (
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {patternRules.length} pattern rules
                  </Badge>
                )}
              </div>
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
          <div className="flex items-center gap-3">
            <span>Processed Document</span>
            {stats && (
              <Badge variant="outline" className="text-xs">
                {Math.round(stats.avgConfidence * 100)}% avg confidence
              </Badge>
            )}
          </div>
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

        {/* Feedback progress bar */}
        {appliedAnnotations.length > 0 && (
          <div className="px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Feedback Progress</span>
              <span className="text-muted-foreground">
                {feedbackStats.accepted + feedbackStats.rejected} / {appliedAnnotations.length} reviewed
              </span>
            </div>
            <div className="flex gap-1 h-2">
              <div
                className="bg-green-500 rounded-l"
                style={{ width: `${(feedbackStats.accepted / appliedAnnotations.length) * 100}%` }}
              />
              <div
                className="bg-red-500"
                style={{ width: `${(feedbackStats.rejected / appliedAnnotations.length) * 100}%` }}
              />
              <div
                className="bg-muted flex-1 rounded-r"
              />
            </div>
          </div>
        )}

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
        <div className="panel-header">Explanation & Feedback</div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            {selectedChunk && selectedExplanation ? (
              <div className="space-y-4">
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Model Decision</span>
                    </div>
                    <Badge
                      className={
                        selectedExplanation.annotation.label === 'KEEP'
                          ? 'bg-label-keep text-white'
                          : selectedExplanation.annotation.label === 'CONDENSE'
                          ? 'bg-label-condense text-white'
                          : 'bg-label-remove text-white'
                      }
                    >
                      {selectedExplanation.annotation.label}
                    </Badge>
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
                      <span className={
                        selectedExplanation.confidence >= 0.8 ? 'text-green-500' :
                        selectedExplanation.confidence >= 0.6 ? 'text-yellow-500' :
                        'text-red-500'
                      }>
                        {Math.round(selectedExplanation.confidence * 100)}%
                      </span>
                    </div>
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

                {/* Feedback Buttons */}
                {feedbackState[selectedChunkId] ? (
                  <div className="p-3 rounded-lg border bg-muted/50 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {feedbackState[selectedChunkId] === 'accepted' ? (
                        <>
                          <ThumbsUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-500">Accepted</span>
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-500">Corrected</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : showCorrectionUI ? (
                  <Card className="p-4 space-y-4 border-yellow-500/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-sm">Provide Correction</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Correct Label</label>
                        <Select
                          value={correctionLabel || undefined}
                          onValueChange={(v) => setCorrectionLabel(v as PrimaryLabel)}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select correct label" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KEEP">KEEP</SelectItem>
                            <SelectItem value="CONDENSE">CONDENSE</SelectItem>
                            <SelectItem value="REMOVE">REMOVE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {correctionLabel === 'REMOVE' && (
                        <div>
                          <label className="text-xs text-muted-foreground">Remove Reason</label>
                          <Select
                            value={correctionRemoveReason}
                            onValueChange={(v) => setCorrectionRemoveReason(v as RemoveReason)}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(REMOVE_REASON_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {correctionLabel === 'CONDENSE' && (
                        <div>
                          <label className="text-xs text-muted-foreground">Condense Strategy</label>
                          <Select
                            value={correctionCondenseStrategy}
                            onValueChange={(v) => setCorrectionCondenseStrategy(v as CondenseStrategy)}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(CONDENSE_STRATEGY_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setShowCorrectionUI(false);
                          setCorrectionLabel(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleReject}
                        disabled={!correctionLabel}
                      >
                        Submit Correction
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAccept(selectedChunkId)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowCorrectionUI(true)}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Correct
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Click on any modified chunk to see why it was changed</p>
                <p className="text-sm mt-2">Provide feedback to improve the model</p>
              </div>
            )}

            <Separator className="my-6" />

            {/* Applied rules summary */}
            <div>
              <h4 className="font-semibold mb-3">Applied Changes</h4>
              <div className="space-y-2">
                {appliedAnnotations.slice(0, 10).map((a, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                      selectedChunkId === a.chunkId
                        ? 'bg-primary/10 border border-primary/30'
                        : feedbackState[a.chunkId]
                        ? 'bg-muted/50'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => {
                      setSelectedChunkId(a.chunkId);
                      setFieldFilter('selected');
                      setShowCorrectionUI(false);
                      setCorrectionLabel(null);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {a.label === 'KEEP' && <Check className="h-3 w-3 text-label-keep" />}
                      {a.label === 'CONDENSE' && <Scissors className="h-3 w-3 text-label-condense" />}
                      {a.label === 'REMOVE' && <Trash2 className="h-3 w-3 text-label-remove" />}
                      <span className="truncate flex-1">{a.rawText.substring(0, 35)}...</span>
                      {feedbackState[a.chunkId] === 'accepted' && (
                        <ThumbsUp className="h-3 w-3 text-green-500" />
                      )}
                      {feedbackState[a.chunkId] === 'rejected' && (
                        <ThumbsDown className="h-3 w-3 text-red-500" />
                      )}
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
              <>
                <Separator className="my-6" />
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="font-semibold">Extracted Fields</h4>
                    <div className="flex gap-1">
                      <Button
                        variant={fieldFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFieldFilter('all')}
                        className="h-7 text-xs"
                      >
                        All
                      </Button>
                      <Button
                        variant={fieldFilter === 'selected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFieldFilter('selected')}
                        disabled={!selectedChunkId}
                        className="h-7 text-xs"
                      >
                        Selected
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {displayedExtractedFields.length} fields
                  </p>
                  <div className="space-y-2">
                    {displayedExtractedFields.slice(0, 8).map(field => (
                      <div key={field.id} className="rounded border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{field.label}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {field.category.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">{field.value}</p>
                        {field.metadata?.isAbnormal && (
                          <Badge variant="destructive" className="mt-1 text-[10px]">
                            Abnormal
                          </Badge>
                        )}
                      </div>
                    ))}
                    {displayedExtractedFields.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{displayedExtractedFields.length - 8} more
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
