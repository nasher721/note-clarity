-- Add UPDATE policy to document_chunks table for complete CRUD authorization
CREATE POLICY "Users can update chunks from their documents"
ON public.document_chunks
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM clinical_documents
  WHERE clinical_documents.id = document_chunks.document_id
  AND clinical_documents.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM clinical_documents
  WHERE clinical_documents.id = document_chunks.document_id
  AND clinical_documents.user_id = auth.uid()
));