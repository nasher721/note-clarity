import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sparkles,
  Trash2,
  RefreshCw,
  Download,
  BarChart3,
} from 'lucide-react';
import { ModelMetrics, PatternRule } from '@/services/activeLearningService';
import { PrimaryLabel } from '@/types/clinical';

interface ModelAnalyticsDashboardProps {
  metrics: ModelMetrics | null;
  patternRules: PatternRule[];
  confusionMatrix: Record<string, Record<string, number>> | null;
  onGeneratePatterns: () => Promise<PatternRule[]>;
  onSavePatterns: (patterns: PatternRule[]) => Promise<void>;
  onTogglePattern: (ruleId: string, isActive: boolean) => Promise<void>;
  onDeletePattern: (ruleId: string) => Promise<void>;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ModelAnalyticsDashboard({
  metrics,
  patternRules,
  confusionMatrix,
  onGeneratePatterns,
  onSavePatterns,
  onTogglePattern,
  onDeletePattern,
  onRefresh,
  isLoading,
}: ModelAnalyticsDashboardProps) {
  const accuracyColor = useMemo(() => {
    if (!metrics) return 'text-muted-foreground';
    if (metrics.accuracyRate >= 0.8) return 'text-green-500';
    if (metrics.accuracyRate >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  }, [metrics?.accuracyRate]);

  const handleGenerateAndSave = async () => {
    const patterns = await onGeneratePatterns();
    if (patterns.length > 0) {
      await onSavePatterns(patterns);
    }
  };

  if (!metrics || metrics.totalPredictions === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle>No Model Data Yet</CardTitle>
          <CardDescription>
            Start using the inference mode to generate predictions, then provide feedback to build your analytics.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Predictions</CardDescription>
            <CardTitle className="text-2xl">{metrics.totalPredictions}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accuracy Rate</CardDescription>
            <CardTitle className={`text-2xl ${accuracyColor}`}>
              {Math.round(metrics.accuracyRate * 100)}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Accepted
            </CardDescription>
            <CardTitle className="text-2xl text-green-500">
              {metrics.acceptedPredictions}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              Rejected
            </CardDescription>
            <CardTitle className="text-2xl text-red-500">
              {metrics.rejectedPredictions}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Per-Label Accuracy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Label Accuracy
            </CardTitle>
            <CardDescription>
              How accurate the model is for each label type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">KEEP</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(metrics.keepAccuracy * 100)}%
                </span>
              </div>
              <Progress value={metrics.keepAccuracy * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">CONDENSE</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(metrics.condenseAccuracy * 100)}%
                </span>
              </div>
              <Progress value={metrics.condenseAccuracy * 100} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">REMOVE</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(metrics.removeAccuracy * 100)}%
                </span>
              </div>
              <Progress value={metrics.removeAccuracy * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Confusion Matrix */}
        {confusionMatrix && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Confusion Matrix
              </CardTitle>
              <CardDescription>
                Predicted vs actual label distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2"></th>
                      <th className="text-center p-2 text-label-keep">KEEP</th>
                      <th className="text-center p-2 text-label-condense">COND</th>
                      <th className="text-center p-2 text-label-remove">REM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['KEEP', 'CONDENSE', 'REMOVE'] as PrimaryLabel[]).map(predicted => (
                      <tr key={predicted}>
                        <td className="p-2 font-medium">{predicted.slice(0, 4)}</td>
                        {(['KEEP', 'CONDENSE', 'REMOVE'] as PrimaryLabel[]).map(actual => {
                          const count = confusionMatrix[predicted]?.[actual] || 0;
                          const isCorrect = predicted === actual;
                          return (
                            <td
                              key={actual}
                              className={`text-center p-2 ${
                                isCorrect ? 'bg-green-500/20 font-bold' : count > 0 ? 'bg-red-500/10' : ''
                              }`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Rows = Predicted, Columns = Actual
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pattern Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Pattern Rules
              </CardTitle>
              <CardDescription>
                Auto-generated and custom pattern rules for labeling
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateAndSave}
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate Patterns
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {patternRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pattern rules yet.</p>
              <p className="text-sm">
                Provide feedback on predictions to generate patterns automatically.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {patternRules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {rule.patternType}
                        </Badge>
                        <Badge
                          className={
                            rule.label === 'KEEP'
                              ? 'bg-label-keep text-white'
                              : rule.label === 'CONDENSE'
                              ? 'bg-label-condense text-white'
                              : 'bg-label-remove text-white'
                          }
                        >
                          {rule.label}
                        </Badge>
                        {rule.autoGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-mono truncate">
                        {rule.patternValue}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Matched: {rule.timesMatched}</span>
                        <span>Accepted: {rule.timesAccepted}</span>
                        <span>
                          Effectiveness: {Math.round(rule.effectivenessScore * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={checked => onTogglePattern(rule.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeletePattern(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-accent/30 border-accent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Improving Model Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • <strong>Provide feedback</strong>: Accept or reject predictions in inference mode
            </li>
            <li>
              • <strong>Use scopes</strong>: Label with "note type" or "global" scope for broader rules
            </li>
            <li>
              • <strong>Enable patterns</strong>: Turn on auto-generated patterns that have high effectiveness
            </li>
            <li>
              • <strong>Be consistent</strong>: Similar content should get similar labels
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
