-- Migration: Add ML feedback and active learning tables
-- This enables the model to learn from user corrections

-- Model feedback table for active learning
CREATE TABLE public.model_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chunk_id UUID NOT NULL,
  document_id UUID NOT NULL,
  -- What the model predicted
  predicted_label TEXT NOT NULL CHECK (predicted_label IN ('KEEP', 'CONDENSE', 'REMOVE')),
  predicted_confidence NUMERIC(4,3) NOT NULL,
  prediction_source TEXT NOT NULL,
  -- What the user corrected it to (null if accepted)
  corrected_label TEXT CHECK (corrected_label IN ('KEEP', 'CONDENSE', 'REMOVE') OR corrected_label IS NULL),
  corrected_remove_reason TEXT,
  corrected_condense_strategy TEXT,
  -- Feedback type
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accept', 'reject', 'modify')),
  -- Context for learning
  chunk_text TEXT NOT NULL,
  chunk_type TEXT NOT NULL,
  note_type TEXT,
  service TEXT,
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Model performance metrics table
CREATE TABLE public.model_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Aggregated metrics
  total_predictions INTEGER NOT NULL DEFAULT 0,
  accepted_predictions INTEGER NOT NULL DEFAULT 0,
  rejected_predictions INTEGER NOT NULL DEFAULT 0,
  modified_predictions INTEGER NOT NULL DEFAULT 0,
  -- Per-label accuracy
  keep_correct INTEGER NOT NULL DEFAULT 0,
  keep_total INTEGER NOT NULL DEFAULT 0,
  condense_correct INTEGER NOT NULL DEFAULT 0,
  condense_total INTEGER NOT NULL DEFAULT 0,
  remove_correct INTEGER NOT NULL DEFAULT 0,
  remove_total INTEGER NOT NULL DEFAULT 0,
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);

-- Pattern rules table for auto-generated patterns
CREATE TABLE public.pattern_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Pattern definition
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('regex', 'keyword', 'ngram', 'semantic')),
  pattern_value TEXT NOT NULL,
  -- Associated label
  label TEXT NOT NULL CHECK (label IN ('KEEP', 'CONDENSE', 'REMOVE')),
  remove_reason TEXT,
  condense_strategy TEXT,
  -- Metadata
  chunk_type TEXT,
  note_type TEXT,
  service TEXT,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('this_document', 'note_type', 'service', 'global')),
  -- Usage tracking
  times_matched INTEGER NOT NULL DEFAULT 0,
  times_accepted INTEGER NOT NULL DEFAULT 0,
  effectiveness_score NUMERIC(4,3) DEFAULT 0.5,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Embedding cache for performance
CREATE TABLE public.embedding_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text_hash TEXT NOT NULL UNIQUE,
  text_preview TEXT NOT NULL, -- First 100 chars for debugging
  embedding JSONB NOT NULL, -- Store as JSON array
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training export table
CREATE TABLE public.training_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_name TEXT NOT NULL,
  export_format TEXT NOT NULL CHECK (export_format IN ('jsonl', 'csv', 'huggingface')),
  record_count INTEGER NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all new tables
ALTER TABLE public.model_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exports ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_feedback
CREATE POLICY "Users can insert their own feedback"
ON public.model_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.model_feedback FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for model_metrics
CREATE POLICY "Users can manage their own metrics"
ON public.model_metrics FOR ALL USING (auth.uid() = user_id);

-- RLS policies for pattern_rules
CREATE POLICY "Users can manage their own pattern rules"
ON public.pattern_rules FOR ALL USING (auth.uid() = user_id);

-- Embedding cache is shared (no sensitive data)
CREATE POLICY "Anyone can read embedding cache"
ON public.embedding_cache FOR SELECT USING (true);

CREATE POLICY "Anyone can insert embedding cache"
ON public.embedding_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update embedding cache"
ON public.embedding_cache FOR UPDATE USING (true);

-- RLS policies for training_exports
CREATE POLICY "Users can manage their own exports"
ON public.training_exports FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_model_feedback_user ON public.model_feedback(user_id);
CREATE INDEX idx_model_feedback_created ON public.model_feedback(created_at DESC);
CREATE INDEX idx_model_feedback_type ON public.model_feedback(feedback_type);
CREATE INDEX idx_pattern_rules_user ON public.pattern_rules(user_id);
CREATE INDEX idx_pattern_rules_active ON public.pattern_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_embedding_cache_hash ON public.embedding_cache(text_hash);
CREATE INDEX idx_embedding_cache_used ON public.embedding_cache(last_used_at);

-- Add effectiveness tracking to learned_rules
ALTER TABLE public.learned_rules
ADD COLUMN IF NOT EXISTS times_matched INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_accepted INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS effectiveness_score NUMERIC(4,3) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
