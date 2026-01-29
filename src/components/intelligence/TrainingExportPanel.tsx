import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Database,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  TrainingExportService,
  ExportFormat,
  ExportOptions,
} from '@/services/trainingExportService';
import { PrimaryLabel } from '@/types/clinical';
import { toast } from '@/hooks/use-toast';

interface TrainingExportPanelProps {
  userId: string | undefined;
}

interface TrainingStats {
  totalExamples: number;
  fromAnnotations: number;
  fromLearnedRules: number;
  labelCounts: Record<PrimaryLabel, number>;
  scopeCounts: Record<string, number>;
  chunkTypeCounts: Record<string, number>;
}

export function TrainingExportPanel({ userId }: TrainingExportPanelProps) {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  // Export options
  const [format, setFormat] = useState<ExportFormat>('jsonl');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [selectedLabels, setSelectedLabels] = useState<PrimaryLabel[]>(['KEEP', 'CONDENSE', 'REMOVE']);

  const loadStats = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await TrainingExportService.getTrainingDataStats(userId);
      setStats(data);

      const history = await TrainingExportService.getExportHistory(userId);
      setExportHistory(history);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleExport = async () => {
    if (!userId) return;

    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format,
        includeMetadata,
        filterByLabel: selectedLabels.length < 3 ? selectedLabels : undefined,
      };

      const result = await TrainingExportService.exportTrainingData(userId, options);

      TrainingExportService.downloadExport(result);

      toast({
        title: 'Export complete',
        description: `Downloaded ${result.recordCount} training examples.`,
      });

      // Refresh history
      const history = await TrainingExportService.getExportHistory(userId);
      setExportHistory(history);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting training data.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleLabel = (label: PrimaryLabel) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Training Data Export</CardTitle>
          <CardDescription>Sign in to export your training data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Training Data
              </CardTitle>
              <CardDescription>
                Available data for model training
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.totalExamples}</p>
                <p className="text-sm text-muted-foreground">Total Examples</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-label-keep">{stats.labelCounts.KEEP}</p>
                <p className="text-sm text-muted-foreground">KEEP</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-label-condense">{stats.labelCounts.CONDENSE}</p>
                <p className="text-sm text-muted-foreground">CONDENSE</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-label-remove">{stats.labelCounts.REMOVE}</p>
                <p className="text-sm text-muted-foreground">REMOVE</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {isLoading ? 'Loading stats...' : 'No training data available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Options
          </CardTitle>
          <CardDescription>
            Configure and download training data for external ML pipelines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jsonl">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSONL (JSON Lines)
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="huggingface">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    HuggingFace Datasets
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {format === 'jsonl' && 'One JSON object per line. Compatible with most ML frameworks.'}
              {format === 'csv' && 'Comma-separated values. Good for spreadsheets and simple analysis.'}
              {format === 'huggingface' && 'Structured JSON with feature schemas. For HuggingFace datasets.'}
            </p>
          </div>

          {/* Include Metadata */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Include Metadata</Label>
              <p className="text-sm text-muted-foreground">
                Add chunk type, scope, remove reason, etc.
              </p>
            </div>
            <Switch
              checked={includeMetadata}
              onCheckedChange={setIncludeMetadata}
            />
          </div>

          {/* Label Filter */}
          <div className="space-y-2">
            <Label>Include Labels</Label>
            <div className="flex gap-4">
              {(['KEEP', 'CONDENSE', 'REMOVE'] as PrimaryLabel[]).map(label => (
                <div key={label} className="flex items-center gap-2">
                  <Checkbox
                    id={`label-${label}`}
                    checked={selectedLabels.includes(label)}
                    onCheckedChange={() => toggleLabel(label)}
                  />
                  <label
                    htmlFor={`label-${label}`}
                    className={`text-sm font-medium cursor-pointer ${
                      label === 'KEEP' ? 'text-label-keep' :
                      label === 'CONDENSE' ? 'text-label-condense' :
                      'text-label-remove'
                    }`}
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <Button
            className="w-full"
            onClick={handleExport}
            disabled={isExporting || !stats || stats.totalExamples === 0 || selectedLabels.length === 0}
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Training Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exportHistory.slice(0, 5).map(exp => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    {exp.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-mono text-xs">{exp.export_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{exp.export_format}</Badge>
                    <span className="text-muted-foreground">
                      {exp.record_count} records
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <Card className="bg-accent/30 border-accent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Using Your Training Data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>JSONL:</strong> Use with <code className="bg-muted px-1 rounded">datasets.load_dataset("json", data_files="file.jsonl")</code>
          </p>
          <p>
            <strong>CSV:</strong> Use with pandas or any spreadsheet software
          </p>
          <p>
            <strong>HuggingFace:</strong> Contains feature schemas for easy integration
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
