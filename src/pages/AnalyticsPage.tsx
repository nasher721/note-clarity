
import { useDocumentContext } from '@/contexts/DocumentContext';
import { StatsCards } from '@/components/analytics/StatsCards';
import { AnnotationDistributionChart } from '@/components/analytics/AnnotationDistributionChart';
import { ActivityChart } from '@/components/analytics/ActivityChart';

export function AnalyticsPage() {
    const { documents } = useDocumentContext();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
            </div>

            <StatsCards documents={documents} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AnnotationDistributionChart documents={documents} />
                <ActivityChart documents={documents} />
            </div>
        </div>
    );
}
