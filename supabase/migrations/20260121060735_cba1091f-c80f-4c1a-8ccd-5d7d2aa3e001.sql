-- Create audit log table for tracking access to PHI data
CREATE TABLE public.phi_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs - users can only view their own access logs
ALTER TABLE public.phi_access_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own audit logs
CREATE POLICY "Users can insert their own access logs"
ON public.phi_access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own access logs
CREATE POLICY "Users can view their own access logs"
ON public.phi_access_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_phi_access_logs_user_id ON public.phi_access_logs(user_id);
CREATE INDEX idx_phi_access_logs_accessed_at ON public.phi_access_logs(accessed_at DESC);
CREATE INDEX idx_phi_access_logs_table_record ON public.phi_access_logs(table_name, record_id);