-- Create enum for primary labels
CREATE TYPE public.primary_label AS ENUM ('KEEP', 'CONDENSE', 'REMOVE');

-- Create enum for label scope
CREATE TYPE public.label_scope AS ENUM ('this_document', 'note_type', 'service', 'global');

-- Create enum for chunk type
CREATE TYPE public.chunk_type AS ENUM (
  'section_header', 'paragraph', 'bullet_list', 'imaging_report', 
  'lab_values', 'medication_list', 'vital_signs', 'attestation', 'unknown'
);

-- Create clinical_documents table
CREATE TABLE public.clinical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  note_type TEXT,
  service TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_chunks table (storing parsed chunks)
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.clinical_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  chunk_type public.chunk_type NOT NULL DEFAULT 'unknown',
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  critical_type TEXT,
  suggested_label public.primary_label,
  confidence NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chunk_annotations table
CREATE TABLE public.chunk_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chunk_id UUID NOT NULL REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label public.primary_label NOT NULL,
  remove_reason TEXT,
  condense_strategy TEXT,
  scope public.label_scope NOT NULL DEFAULT 'this_document',
  override_justification TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chunk_id, user_id)
);

-- Create learned_rules table for global/reusable rules
CREATE TABLE public.learned_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_text TEXT NOT NULL,
  chunk_type public.chunk_type,
  label public.primary_label NOT NULL,
  remove_reason TEXT,
  condense_strategy TEXT,
  scope public.label_scope NOT NULL,
  note_type TEXT,
  service TEXT,
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunk_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for clinical_documents
CREATE POLICY "Users can view their own documents"
  ON public.clinical_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.clinical_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.clinical_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.clinical_documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for document_chunks (via document ownership)
CREATE POLICY "Users can view chunks of their documents"
  ON public.document_chunks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clinical_documents 
    WHERE id = document_chunks.document_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create chunks for their documents"
  ON public.document_chunks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clinical_documents 
    WHERE id = document_chunks.document_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete chunks from their documents"
  ON public.document_chunks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clinical_documents 
    WHERE id = document_chunks.document_id AND user_id = auth.uid()
  ));

-- RLS policies for chunk_annotations
CREATE POLICY "Users can view their own annotations"
  ON public.chunk_annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own annotations"
  ON public.chunk_annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
  ON public.chunk_annotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
  ON public.chunk_annotations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for learned_rules
CREATE POLICY "Users can view their own rules"
  ON public.learned_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules"
  ON public.learned_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON public.learned_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON public.learned_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_clinical_documents_updated_at
  BEFORE UPDATE ON public.clinical_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chunk_annotations_updated_at
  BEFORE UPDATE ON public.chunk_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learned_rules_updated_at
  BEFORE UPDATE ON public.learned_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_documents_user_id ON public.clinical_documents(user_id);
CREATE INDEX idx_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX idx_annotations_chunk_id ON public.chunk_annotations(chunk_id);
CREATE INDEX idx_annotations_user_id ON public.chunk_annotations(user_id);
CREATE INDEX idx_rules_user_id ON public.learned_rules(user_id);