import { useState, useEffect } from 'react';
import { 
  DocumentChunk, 
  PrimaryLabel, 
  RemoveReason, 
  CondenseStrategy, 
  LabelScope,
  REMOVE_REASON_LABELS,
  CONDENSE_STRATEGY_LABELS,
  SCOPE_LABELS 
} from '@/types/clinical';
import { useLabelingShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Check, 
  Scissors, 
  Trash2, 
  AlertTriangle, 
  X,
  Keyboard,
  Pencil,
  RotateCcw
} from 'lucide-react';

interface LabelingPanelProps {
  chunk: DocumentChunk | null;
  currentLabel?: PrimaryLabel;
  currentReason?: RemoveReason;
  currentStrategy?: CondenseStrategy;
  currentScope?: LabelScope;
  onAnnotate: (
    label: PrimaryLabel,
    options: {
      removeReason?: RemoveReason;
      condenseStrategy?: CondenseStrategy;
      scope?: LabelScope;
      overrideJustification?: string;
    }
  ) => void;
  onClear: () => void;
}

export function LabelingPanel({
  chunk,
  currentLabel,
  currentReason,
  currentStrategy,
  currentScope = 'global',
  onAnnotate,
  onClear,
}: LabelingPanelProps) {
  const [label, setLabel] = useState<PrimaryLabel | null>(currentLabel || null);
  const [removeReason, setRemoveReason] = useState<RemoveReason | null>(currentReason || null);
  const [condenseStrategy, setCondenseStrategy] = useState<CondenseStrategy | null>(currentStrategy || null);
  const [scope, setScope] = useState<LabelScope>(currentScope);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [showCriticalWarning, setShowCriticalWarning] = useState(false);
  
  const isEditing = !!currentLabel;
  const hasChanges = label !== currentLabel || 
    removeReason !== currentReason || 
    condenseStrategy !== currentStrategy ||
    scope !== currentScope;

  useEffect(() => {
    setLabel(currentLabel || null);
    setRemoveReason(currentReason || null);
    setCondenseStrategy(currentStrategy || null);
    setScope(currentScope);
    setOverrideJustification('');
    setShowCriticalWarning(false);
  }, [chunk?.id, currentLabel, currentReason, currentStrategy, currentScope]);

  // Use centralized keyboard shortcuts
  useLabelingShortcuts(
    {
      onKeep: () => setLabel('KEEP'),
      onCondense: () => setLabel('CONDENSE'),
      onRemove: () => setLabel('REMOVE'),
      onClear: () => setLabel(null),
    },
    !!chunk
  );

  const handleResetToOriginal = () => {
    setLabel(currentLabel || null);
    setRemoveReason(currentReason || null);
    setCondenseStrategy(currentStrategy || null);
    setScope(currentScope);
  };

  if (!chunk) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p className="mb-4">Select a chunk from the document to begin labeling</p>
        <div className="flex justify-center gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="kbd">1</span> Keep</span>
          <span className="flex items-center gap-1"><span className="kbd">2</span> Condense</span>
          <span className="flex items-center gap-1"><span className="kbd">3</span> Remove</span>
        </div>
      </Card>
    );
  }

  const handleApply = () => {
    if (!label) return;

    if (label === 'REMOVE' && chunk.isCritical && !overrideJustification) {
      setShowCriticalWarning(true);
      return;
    }

    onAnnotate(label, {
      removeReason: label === 'REMOVE' ? removeReason || undefined : undefined,
      condenseStrategy: label === 'CONDENSE' ? condenseStrategy || undefined : undefined,
      scope,
      overrideJustification: chunk.isCritical ? overrideJustification : undefined,
    });
  };

  const isValid = label && (
    (label === 'KEEP') ||
    (label === 'REMOVE' && removeReason) ||
    (label === 'CONDENSE' && condenseStrategy)
  );

  return (
    <Card className={cn(
      "p-4 space-y-4 transition-all",
      isEditing && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
    )}>
      {/* Edit mode indicator */}
      {isEditing && (
        <div className="flex items-center justify-between p-2 -mt-2 -mx-2 mb-2 bg-primary/10 rounded-t-lg border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Pencil className="h-4 w-4" />
            Editing existing label
          </div>
          <Badge 
            className={cn(
              "text-xs",
              currentLabel === 'KEEP' && 'bg-label-keep text-white',
              currentLabel === 'CONDENSE' && 'bg-label-condense text-black',
              currentLabel === 'REMOVE' && 'bg-label-remove text-white'
            )}
          >
            Current: {currentLabel}
          </Badge>
        </div>
      )}
      
      {/* Chunk preview */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground mb-1">
          {isEditing ? 'Editing chunk:' : 'Selected chunk:'}
        </p>
        <p className="text-sm font-mono line-clamp-3">{chunk.text}</p>
      </div>

      {/* Critical warning */}
      {chunk.isCritical && (
        <div className="flex items-start gap-2 p-3 bg-warning-bg border border-warning rounded-lg">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-warning">Critical Content Detected</p>
            <p className="text-muted-foreground">
              This section contains {chunk.criticalType?.replace(/_/g, ' ')}. 
              Removing requires justification.
            </p>
          </div>
        </div>
      )}

      {/* Primary label selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">
            {isEditing ? 'Change Label' : 'Primary Label'}
          </Label>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Keyboard className="h-3 w-3" />
            <span className="kbd">1</span>
            <span className="kbd">2</span>
            <span className="kbd">3</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={label === 'KEEP' ? 'default' : 'outline'}
            className={cn(
              label === 'KEEP' ? 'bg-label-keep hover:bg-label-keep/90' : '',
              isEditing && currentLabel === 'KEEP' && label !== 'KEEP' && 'border-label-keep/50'
            )}
            onClick={() => setLabel('KEEP')}
          >
            <Check className="h-4 w-4 mr-1" />
            Keep
          </Button>
          <Button
            variant={label === 'CONDENSE' ? 'default' : 'outline'}
            className={cn(
              label === 'CONDENSE' ? 'bg-label-condense hover:bg-label-condense/90 text-black' : '',
              isEditing && currentLabel === 'CONDENSE' && label !== 'CONDENSE' && 'border-label-condense/50'
            )}
            onClick={() => setLabel('CONDENSE')}
          >
            <Scissors className="h-4 w-4 mr-1" />
            Condense
          </Button>
          <Button
            variant={label === 'REMOVE' ? 'default' : 'outline'}
            className={cn(
              label === 'REMOVE' ? 'bg-label-remove hover:bg-label-remove/90' : '',
              isEditing && currentLabel === 'REMOVE' && label !== 'REMOVE' && 'border-label-remove/50'
            )}
            onClick={() => setLabel('REMOVE')}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>

      <Separator />

      {/* Remove reason */}
      {label === 'REMOVE' && (
        <div className="space-y-2">
          <Label className="font-semibold">Reason for Removal</Label>
          <RadioGroup 
            value={removeReason || ''} 
            onValueChange={(v) => setRemoveReason(v as RemoveReason)}
            className="grid grid-cols-1 gap-1"
          >
            {Object.entries(REMOVE_REASON_LABELS).map(([value, label]) => (
              <div key={value} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                <RadioGroupItem value={value} id={value} />
                <Label htmlFor={value} className="text-sm cursor-pointer flex-1">{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Condense strategy */}
      {label === 'CONDENSE' && (
        <div className="space-y-2">
          <Label className="font-semibold">Condense Strategy</Label>
          <RadioGroup 
            value={condenseStrategy || ''} 
            onValueChange={(v) => setCondenseStrategy(v as CondenseStrategy)}
            className="grid grid-cols-1 gap-1"
          >
            {Object.entries(CONDENSE_STRATEGY_LABELS).map(([value, label]) => (
              <div key={value} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                <RadioGroupItem value={value} id={value} />
                <Label htmlFor={value} className="text-sm cursor-pointer flex-1">{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Scope */}
      {label && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="font-semibold">Apply to</Label>
            <RadioGroup 
              value={scope} 
              onValueChange={(v) => setScope(v as LabelScope)}
              className="grid grid-cols-2 gap-1"
            >
              {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                  <RadioGroupItem value={value} id={`scope-${value}`} />
                  <Label htmlFor={`scope-${value}`} className="text-sm cursor-pointer">{label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </>
      )}

      {/* Override justification for critical content */}
      {showCriticalWarning && label === 'REMOVE' && chunk.isCritical && (
        <div className="space-y-2 p-3 bg-destructive/10 border border-destructive rounded-lg">
          <Label className="font-semibold text-destructive">
            Required: Justification for removing critical content
          </Label>
          <Textarea
            value={overrideJustification}
            onChange={(e) => setOverrideJustification(e.target.value)}
            placeholder="Explain why this critical content can be safely removed..."
            className="min-h-[80px]"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Change indicator when editing */}
        {isEditing && hasChanges && (
          <div className="flex items-center justify-between p-2 bg-accent/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Unsaved changes</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToOriginal}
              className="h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onClear();
              setLabel(null);
              setRemoveReason(null);
              setCondenseStrategy(null);
            }}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            {isEditing ? 'Remove Label' : 'Clear'}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!isValid || (isEditing && !hasChanges)}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-1" />
            {isEditing ? 'Update Label' : 'Apply Label'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
