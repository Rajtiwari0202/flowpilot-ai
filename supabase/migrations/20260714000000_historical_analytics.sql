CREATE TABLE IF NOT EXISTS public.historical_analytics (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    leads_count INTEGER DEFAULT 0,
    approvals_count INTEGER DEFAULT 0,
    rejections_count INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER DEFAULT 0,
    time_saved_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS historical_analytics_user_id_idx ON public.historical_analytics(user_id);
CREATE INDEX IF NOT EXISTS historical_analytics_date_idx ON public.historical_analytics(date);
