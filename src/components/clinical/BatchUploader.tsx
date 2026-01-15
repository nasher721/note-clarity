import { useState, useCallback } from 'react';
import { Upload, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BatchItem {
  id: string;
  text: string;
  noteType?: string;
  service?: string;
  patientId?: string;
}

interface BatchUploaderProps {
  onBatchSubmit: (items: Array<{
    text: string;
    noteType?: string;
    service?: string;
    patientId?: string;
  }>) => void;
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

export function BatchUploader({ onBatchSubmit }: BatchUploaderProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [currentNoteType, setCurrentNoteType] = useState('');
  const [currentService, setCurrentService] = useState('');
  const [currentPatientId, setCurrentPatientId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState(false);

  const addItem = () => {
    if (!currentText.trim()) return;

    setItems(prev => [...prev, {
      id: `item-${Date.now()}`,
      text: currentText.trim(),
      noteType: currentNoteType || undefined,
      service: currentService || undefined,
      patientId: currentPatientId || undefined,
    }]);

    setCurrentText('');
    setCurrentPatientId('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleBulkParse = () => {
    // Split by common delimiters: triple newlines, horizontal rules, or "---"
    const delimiter = /\n{3,}|^-{3,}$/gm;
    const notes = bulkText.split(delimiter).filter(n => n.trim().length > 50);

    const newItems: BatchItem[] = notes.map((text, i) => ({
      id: `bulk-${Date.now()}-${i}`,
      text: text.trim(),
      noteType: currentNoteType || undefined,
      service: currentService || undefined,
    }));

    setItems(prev => [...prev, ...newItems]);
    setBulkText('');
    setBulkMode(false);
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    
    onBatchSubmit(items.map(({ id, ...rest }) => rest));
    setItems([]);
    setOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      
      newItems.push({
        id: `file-${Date.now()}-${i}`,
        text: text.trim(),
        noteType: currentNoteType || undefined,
        service: currentService || undefined,
        patientId: file.name.replace(/\.[^/.]+$/, ''),
      });
    }

    setItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Batch Upload
          <Badge variant="secondary">Multiple</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Batch Upload Clinical Notes
          </DialogTitle>
          <DialogDescription>
            Add multiple patient notes to process in sequence. You can label them one by one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Default settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Default Note Type</Label>
              <Select value={currentNoteType} onValueChange={setCurrentNoteType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Service</Label>
              <Select value={currentService} onValueChange={setCurrentService}>
                <SelectTrigger>
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

          {/* Upload options */}
          <div className="flex gap-2 flex-wrap">
            <label>
              <Input
                type="file"
                accept=".txt"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </span>
              </Button>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkMode(!bulkMode)}
            >
              {bulkMode ? 'Single Entry' : 'Bulk Paste'}
            </Button>
          </div>

          {/* Input area */}
          {bulkMode ? (
            <div className="space-y-2">
              <Label>Paste multiple notes (separated by 3+ blank lines or ---)</Label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste multiple clinical notes here...&#10;&#10;---&#10;&#10;Each note separated by --- or blank lines..."
                className="min-h-[120px] font-mono text-sm"
              />
              <Button onClick={handleBulkParse} disabled={!bulkText.trim()}>
                Parse Notes
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Patient ID (optional)</Label>
                  <Input
                    value={currentPatientId}
                    onChange={(e) => setCurrentPatientId(e.target.value)}
                    placeholder="PT-001"
                  />
                </div>
              </div>
              <Textarea
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder="Paste clinical note here..."
                className="min-h-[100px] font-mono text-sm"
              />
              <Button onClick={addItem} disabled={!currentText.trim()} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add to Queue
              </Button>
            </div>
          )}

          {/* Queue preview */}
          {items.length > 0 && (
            <div className="flex-1 overflow-hidden border rounded-lg">
              <div className="p-2 bg-muted border-b flex items-center justify-between">
                <span className="text-sm font-medium">
                  Queue ({items.length} note{items.length !== 1 ? 's' : ''})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems([])}
                  className="h-7 text-xs text-destructive"
                >
                  Clear All
                </Button>
              </div>
              <ScrollArea className="h-[150px]">
                <div className="p-2 space-y-1">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 bg-card rounded border"
                    >
                      <Badge variant="outline" className="shrink-0">
                        #{index + 1}
                      </Badge>
                      {item.patientId && (
                        <Badge variant="secondary" className="shrink-0">
                          {item.patientId}
                        </Badge>
                      )}
                      <span className="text-xs font-mono truncate flex-1">
                        {item.text.substring(0, 60)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={items.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Start Processing {items.length > 0 && `(${items.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
