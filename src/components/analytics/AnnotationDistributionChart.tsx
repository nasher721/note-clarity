
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClinicalDocument } from '@/types/clinical';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AnnotationDistributionChartProps {
    documents: ClinicalDocument[];
}

export function AnnotationDistributionChart({ documents }: AnnotationDistributionChartProps) {
    let keep = 0;
    let remove = 0;
    let condense = 0;
    let unlabeled = 0;

    documents.forEach(doc => {
        const annotatedChunks = new Set(doc.annotations.map(a => a.chunkId));

        doc.annotations.forEach(a => {
            if (a.label === 'KEEP') keep++;
            else if (a.label === 'REMOVE') remove++;
            else if (a.label === 'CONDENSE') condense++;
        });

        // Count unlabeled chunks
        unlabeled += doc.chunks.filter(c => !annotatedChunks.has(c.id)).length;
    });

    const data = [
        { name: 'Keep', value: keep, color: '#22c55e' }, // green-500
        { name: 'Condense', value: condense, color: '#eab308' }, // yellow-500
        { name: 'Remove', value: remove, color: '#ef4444' }, // red-500
        { name: 'Unlabeled', value: unlabeled, color: '#94a3b8' }, // slate-400
    ].filter(d => d.value > 0);

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Annotation Distribution</CardTitle>
                <CardDescription>Breakdown of actions taken on chunks</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`${value} chunks`, 'Count']}
                                contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
