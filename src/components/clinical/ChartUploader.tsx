import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, User } from 'lucide-react';
import { parseChart, ParsedNote, getChartSummary } from '@/utils/chartParser';

interface ChartUploaderProps {
  onChartSubmit: (patientId: string, notes: ParsedNote[]) => void;
}

export function ChartUploader({ onChartSubmit }: ChartUploaderProps) {
  const [text, setText] = useState('');
  const [patientId, setPatientId] = useState('');
  const [preview, setPreview] = useState<ParsedNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = useCallback(() => {
    if (!text.trim()) {
      setError('Please paste clinical data');
      return;
    }
    
    setError(null);
    const notes = parseChart(text);
    
    if (notes.length === 0) {
      setError('Could not detect any clinical notes. Try adding clearer note headers or date separators.');
      return;
    }
    
    setPreview(notes);
  }, [text]);

  const handleSubmit = useCallback(() => {
    if (!preview || preview.length === 0) return;
    
    const pid = patientId.trim() || `Patient-${Date.now().toString(36).toUpperCase()}`;
    onChartSubmit(pid, preview);
    
    // Reset form
    setText('');
    setPatientId('');
    setPreview(null);
  }, [preview, patientId, onChartSubmit]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
      setPreview(null);
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const summary = preview ? getChartSummary(preview) : null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Single Patient Chart
        </CardTitle>
        <CardDescription>
          Upload or paste a complete patient chart. Notes will be auto-split by headers and dates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="patient-id" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Patient ID (optional)
          </Label>
          <Input
            id="patient-id"
            placeholder="e.g., MRN-12345"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Chart Data</Label>
          <Textarea
            placeholder="Paste complete patient chart here...

Example formats detected:
---
01/15/2026 08:30 AM
Progress Note
Chief Complaint: ...

---
DISCHARGE SUMMARY
Date: 01/14/2026
...

---
H&P
History and Physical
..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
              setError(null);
            }}
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="chart-file-upload"
            className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent transition-colors text-sm"
          >
            <Upload className="h-4 w-4" />
            Upload .txt file
          </Label>
          <input
            id="chart-file-upload"
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {preview && summary && (
          <div className="p-4 bg-accent/30 rounded-lg border border-accent space-y-3">
            <div className="font-medium">
              Detected {summary.noteCount} note{summary.noteCount !== 1 ? 's' : ''}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.noteTypes).map(([type, count]) => (
                <span
                  key={type}
                  className="px-2 py-1 bg-background rounded text-xs"
                >
                  {type} ({count})
                </span>
              ))}
            </div>

            {summary.dateRange && (
              <div className="text-sm text-muted-foreground">
                Date range: {summary.dateRange.earliest} — {summary.dateRange.latest}
              </div>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {preview.map((note, idx) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 text-sm p-2 bg-background rounded"
                >
                  <span className="text-muted-foreground w-6">{idx + 1}.</span>
                  <span className="font-medium">{note.noteType}</span>
                  {note.dateTime && (
                    <span className="text-muted-foreground text-xs">
                      ({note.dateTime})
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {note.text.length} chars
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!preview ? (
            <Button
              onClick={handlePreview}
              disabled={!text.trim()}
              className="flex-1"
            >
              Preview Split
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
              >
                Edit
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
              >
                Start Labeling ({preview.length} notes)
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
