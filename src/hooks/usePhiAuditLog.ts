import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AuditAction = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

interface AuditLogEntry {
  tableName: string;
  recordId: string;
  action: AuditAction;
}

export function usePhiAuditLog(userId: string | undefined) {
  const logAccess = useCallback(async (entries: AuditLogEntry | AuditLogEntry[]) => {
    if (!userId) return;

    const entriesArray = Array.isArray(entries) ? entries : [entries];
    
    if (entriesArray.length === 0) return;

    try {
      const logs = entriesArray.map(entry => ({
        user_id: userId,
        table_name: entry.tableName,
        record_id: entry.recordId,
        action: entry.action,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }));

      // Fire and forget - don't block the main operation
      supabase
        .from('phi_access_logs')
        .insert(logs)
        .then(({ error }) => {
          if (error && import.meta.env.DEV) {
            console.warn('Failed to log PHI access:', error.message);
          }
        });
    } catch {
      // Silently fail audit logging to not disrupt user operations
      // In production, this would go to a monitoring service
    }
  }, [userId]);

  const logDocumentAccess = useCallback((documentId: string, action: AuditAction = 'SELECT') => {
    logAccess({
      tableName: 'clinical_documents',
      recordId: documentId,
      action,
    });
  }, [logAccess]);

  const logChunkAccess = useCallback((chunkIds: string[], action: AuditAction = 'SELECT') => {
    logAccess(chunkIds.map(id => ({
      tableName: 'document_chunks',
      recordId: id,
      action,
    })));
  }, [logAccess]);

  const logAnnotationAccess = useCallback((annotationId: string, action: AuditAction) => {
    logAccess({
      tableName: 'chunk_annotations',
      recordId: annotationId,
      action,
    });
  }, [logAccess]);

  return {
    logAccess,
    logDocumentAccess,
    logChunkAccess,
    logAnnotationAccess,
  };
}
