-- Seed missing workflow templates for sandbox and demo workspaces
INSERT INTO public.workflow_templates (id, title, description, category, recommended, trigger_key, actions)
VALUES
  ('tpl_whatsapp_routing', 'WhatsApp Routing', 'Route WhatsApp messages to the right team or team member.', 'communication', false, 'whatsapp.message_received', '["classify_message","route_conversation","log_activity"]'),
  ('tpl_meeting_follow_up', 'Meeting Follow-Up', 'Send personalized follow-ups after every call or demo automatically.', 'sales', false, 'meeting.completed', '["summarize_notes","draft_reply","send_email"]'),
  ('tpl_crm_auto_update', 'CRM Auto-Update', 'Sync lead data to your CRM automatically on every interaction.', 'crm', false, 'lead.updated', '["normalize_contact","update_crm","log_activity"]')
ON CONFLICT (id) DO NOTHING;
