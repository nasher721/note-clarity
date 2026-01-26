
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClinicalDocument } from '@/types/clinical';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';

interface ActivityChartProps {
    documents: ClinicalDocument[];
}

export function ActivityChart({ documents }: ActivityChartProps) {
    // Generate last 7 days data
    const data = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayDocs = documents.filter(d => isSameDay(new Date(d.createdAt), date));

        return {
            date: format(date, 'MMM dd'),
            notes: dayDocs.length,
            annotations: dayDocs.reduce((acc, d) => acc + d.annotations.length, 0),
        };
    });

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>Notes processed and annotations made over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                            />
                            <Bar dataKey="notes" name="Notes" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="annotations" name="Annotations" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
