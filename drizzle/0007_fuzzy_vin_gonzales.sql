ALTER TYPE "public"."application_status" ADD VALUE 'referral_requested' BEFORE 'applied';--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'referral_given' BEFORE 'applied';