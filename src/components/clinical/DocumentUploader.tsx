import { useState, useCallback } from 'react';
import { Upload, FileText, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DocumentUploaderProps {
  onDocumentSubmit: (text: string, noteType?: string, service?: string) => void;
}

const NOTE_TYPES = [
  'Daily Progress Note',
  'Admission Note',
  'Discharge Summary',
  'Consult Note',
  'Procedure Note',
  'Handoff Note',
  'Transfer Note',
];

const SERVICES = [
  'ICU',
  'Medicine',
  'Surgery',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Pediatrics',
  'Emergency',
];

export function DocumentUploader({ onDocumentSubmit }: DocumentUploaderProps) {
  const [text, setText] = useState('');
  const [noteType, setNoteType] = useState<string>('');
  const [service, setService] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = () => {
    if (text.trim()) {
      onDocumentSubmit(text.trim(), noteType || undefined, service || undefined);
      setText('');
    }
  };

  const handlePaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  }, []);

  return (
    <Card className="p-6 border-2 border-dashed border-border bg-card/50">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Upload Clinical Document
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="noteType">Note Type (optional)</Label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger id="noteType">
                <SelectValue placeholder="Select note type" />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service">Service (optional)</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger id="service">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={`relative rounded-lg transition-colors ${
            isDragging ? 'bg-accent/50 border-primary' : 'bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Textarea
            placeholder="Paste or type clinical note here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] font-mono text-sm resize-y bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          
          {!text && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground">
              <Upload className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Drop a .txt file or paste content</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePaste} variant="outline" size="sm">
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Paste from Clipboard
          </Button>
          
          <label>
            <Input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </span>
            </Button>
          </label>

          <div className="flex-1" />

          <Button 
            onClick={handleSubmit} 
            disabled={!text.trim()}
            className="min-w-[120px]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Process Document
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tip: The document will be automatically segmented into labeled chunks for training.
        </p>
      </div>
    </Card>
  );
}
