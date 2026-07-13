-- Create production compound and optimized indexes for scalability

-- Optimize auth token lookup by kind and hash
CREATE INDEX IF NOT EXISTS auth_tokens_kind_hash_idx ON public.auth_tokens(kind, token_hash);

-- Optimize outbox recovery processing
CREATE INDEX IF NOT EXISTS outbox_status_idx ON public.outbox(status);

-- Optimize paginated user activity retrieval ordered by creation time
CREATE INDEX IF NOT EXISTS activity_logs_user_created_idx ON public.activity_logs(user_id, created_at DESC);
