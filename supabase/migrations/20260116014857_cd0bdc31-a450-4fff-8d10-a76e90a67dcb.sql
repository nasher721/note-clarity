-- Create table for text highlights (free-form text annotations)
CREATE TABLE public.text_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.clinical_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  label public.primary_label NOT NULL,
  remove_reason TEXT,
  condense_strategy TEXT,
  scope public.label_scope NOT NULL DEFAULT 'this_document',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.text_highlights ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own highlights"
ON public.text_highlights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own highlights"
ON public.text_highlights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
ON public.text_highlights
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
ON public.text_highlights
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_text_highlights_updated_at
BEFORE UPDATE ON public.text_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_text_highlights_document_id ON public.text_highlights(document_id);
CREATE INDEX idx_text_highlights_user_id ON public.text_highlights(user_id);