import { useMemo, useState } from 'react';
import { Network, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const sampleResults = [
  { title: 'Diabetic nephropathy follow-up', tags: ['diabetes', 'kidney', 'A1C trend'], similarity: 0.92 },
  { title: 'CHF exacerbation discharge', tags: ['cardiology', 'BNP', 'diuretics'], similarity: 0.89 },
  { title: 'Chest pain workup', tags: ['troponin', 'EKG', 'risk'], similarity: 0.86 },
];

export const SemanticSearchPanel = () => {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    if (!query.trim()) return sampleResults;
    const lower = query.toLowerCase();
    return sampleResults.filter((result) =>
      [result.title, ...result.tags].some((term) => term.toLowerCase().includes(lower))
    );
  }, [query]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" /> Semantic Search & Knowledge Graph
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by concept: diabetic complications"
          />
          <Button>Search</Button>
        </div>
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.title} className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{result.title}</p>
                <Badge variant="outline">{result.similarity.toFixed(2)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 text-sm flex items-start gap-3">
          <Network className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Knowledge graph</p>
            <p className="text-xs text-muted-foreground">
              Patients ↔ Conditions ↔ Medications ↔ Outcomes with auto-detected patterns and temporal progression views.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
