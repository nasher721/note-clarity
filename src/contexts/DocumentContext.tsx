
import React, { createContext, useContext, ReactNode } from 'react';
import { useDocuments } from '@/hooks/documents';
import { useDocumentCreate } from '@/hooks/documents';
import { useAuth } from '@/hooks/useAuth';
import { ClinicalDocument } from '@/types/clinical';
import { toast } from '@/hooks/use-toast';

interface DocumentContextType {
    documents: ClinicalDocument[];
    currentDocument: ClinicalDocument | null;
    loading: boolean;
    selectDocument: (docId: string) => void;
    createDocument: (content: string, noteType?: string, service?: string) => Promise<ClinicalDocument | null>;
    updateDocumentInList: (updatedDoc: ClinicalDocument) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    const {
        documents,
        currentDocument,
        loading,
        selectDocument,
        updateDocumentInList,
        addDocumentToList,
    } = useDocuments(user?.id);

    const { createDocument } = useDocumentCreate(user?.id, addDocumentToList);

    const value = {
        documents,
        currentDocument,
        loading,
        selectDocument,
        createDocument,
        updateDocumentInList,
    };

    return (
        <DocumentContext.Provider value={value}>
            {children}
        </DocumentContext.Provider>
    );
}

export function useDocumentContext() {
    const context = useContext(DocumentContext);
    if (context === undefined) {
        throw new Error('useDocumentContext must be used within a DocumentProvider');
    }
    return context;
}
