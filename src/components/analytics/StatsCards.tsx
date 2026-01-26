
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClinicalDocument } from '@/types/clinical';
import { FileText, Clock, Percent, Activity } from 'lucide-react';

interface StatsCardsProps {
    documents: ClinicalDocument[];
}

export function StatsCards({ documents }: StatsCardsProps) {
    const totalNotes = documents.length;

    // Calculate stats
    let totalChunks = 0;
    let removedChunks = 0;
    let condensedChunks = 0;

    documents.forEach(doc => {
        totalChunks += doc.chunks.length;
        doc.annotations.forEach(a => {
            if (a.label === 'REMOVE') removedChunks++;
            if (a.label === 'CONDENSE') condensedChunks++;
        });
    });

    const noiseReduction = totalChunks > 0
        ? Math.round(((removedChunks + (condensedChunks * 0.5)) / totalChunks) * 100)
        : 0;

    // Estimate time saved: assume avg chunk reading time is 5 seconds.
    // Removed = 5s saved, Condensed = 2.5s saved.
    const secondsSaved = (removedChunks * 5) + (condensedChunks * 2.5);
    const minutesSaved = Math.round(secondsSaved / 60);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalNotes}</div>
                    <p className="text-xs text-muted-foreground">
                        Processed documents
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Noise Reduction</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{noiseReduction}%</div>
                    <p className="text-xs text-muted-foreground">
                        Content removed or condensed
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{minutesSaved}m</div>
                    <p className="text-xs text-muted-foreground">
                        Estimated reading time saved
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{removedChunks + condensedChunks}</div>
                    <p className="text-xs text-muted-foreground">
                        Edits performed
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
