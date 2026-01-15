import { ClinicalDocument } from '@/types/clinical';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Tag, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentHistoryProps {
  documents: ClinicalDocument[];
  onSelect: (docId: string) => void;
  loading?: boolean;
}

export function DocumentHistory({ documents, onSelect, loading }: DocumentHistoryProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Your Documents
      </h3>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelect(doc.id)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(doc.createdAt, 'MMM d, yyyy')}
              </div>
              <Badge variant="secondary" className="text-xs">
                {doc.chunks.length} chunks
              </Badge>
            </div>
            
            <p className="text-sm font-mono line-clamp-2 mb-3">
              {doc.originalText.substring(0, 100)}...
            </p>
            
            <div className="flex flex-wrap gap-1">
              {doc.noteType && (
                <Badge variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {doc.noteType}
                </Badge>
              )}
              {doc.service && (
                <Badge variant="outline" className="text-xs">
                  {doc.service}
                </Badge>
              )}
              {doc.annotations.length > 0 && (
                <Badge className="text-xs bg-label-keep/20 text-label-keep border-0">
                  {doc.annotations.length} labeled
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
