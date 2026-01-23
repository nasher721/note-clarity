import { ChartUploader } from '@/components/clinical/ChartUploader';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { ParsedNote } from '@/utils/chartParser';

export interface ChartModePageProps {
  onChartSubmit: (patientId: string, notes: ParsedNote[]) => void;
  onBackToTraining: () => void;
}

export function ChartModePage({
  onChartSubmit,
  onBackToTraining,
}: ChartModePageProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 p-4 bg-accent/30 rounded-lg border border-accent">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Chart Mode</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a complete patient chart. Notes are automatically split by headers like 
          "Progress Note", "H&P", dates, etc.
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <ChartUploader onChartSubmit={onChartSubmit} />
      </div>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={onBackToTraining}>
          Back to Single Mode
        </Button>
      </div>
    </div>
  );
}
