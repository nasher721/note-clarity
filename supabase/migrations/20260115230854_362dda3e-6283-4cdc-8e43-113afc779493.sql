-- Drop the existing UPDATE policy and recreate with WITH CHECK clause
DROP POLICY IF EXISTS "Users can update their own documents" ON public.clinical_documents;

CREATE POLICY "Users can update their own documents" 
ON public.clinical_documents 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);