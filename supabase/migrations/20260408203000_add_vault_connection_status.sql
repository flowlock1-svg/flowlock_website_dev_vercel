-- Add connection status columns for the Vault Protection Onboarding

ALTER TABLE "public"."user_preferences"
ADD COLUMN IF NOT EXISTS "extension_connected" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "agent_connected" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "agent_last_ping_at" timestamp with time zone;
