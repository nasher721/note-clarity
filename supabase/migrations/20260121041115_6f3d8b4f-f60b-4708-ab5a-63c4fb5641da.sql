-- Fix UPDATE policy to include WITH CHECK clause
DROP POLICY IF EXISTS "Users can update their own highlights" ON public.text_highlights;

CREATE POLICY "Users can update their own highlights"
ON public.text_highlights
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);