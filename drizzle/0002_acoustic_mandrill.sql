ALTER TYPE "public"."application_status" ADD VALUE 'referral' BEFORE 'applied';--> statement-breakpoint
ALTER TABLE "application_tags" ALTER COLUMN "tag" SET DATA TYPE text;--> statement-breakpoint
--> The generic 'referral' tag is replaced by two explicit ones. Rewrite the
--> existing rows while the column is still text: the cast back to the new enum
--> at the end of this migration fails on any row still holding 'referral'.
--> Delete first -- an application already carrying referral_requested would
--> otherwise collide with the unique index when its 'referral' row is renamed.
DELETE FROM "application_tags" a
  USING "application_tags" b
  WHERE a."application_id" = b."application_id"
    AND a."tag" = 'referral'
    AND b."tag" = 'referral_requested';--> statement-breakpoint
UPDATE "application_tags" SET "tag" = 'referral_requested' WHERE "tag" = 'referral';--> statement-breakpoint
DROP TYPE "public"."application_tag";--> statement-breakpoint
CREATE TYPE "public"."application_tag" AS ENUM('online_assessment', 'screening_call', 'take_home', 'tech_screen', 'referral_requested', 'referral_given', 'recruiter_reachout', 'panel_round', 'system_design', 'offer_negotiation', 'needs_follow_up');--> statement-breakpoint
ALTER TABLE "application_tags" ALTER COLUMN "tag" SET DATA TYPE "public"."application_tag" USING "tag"::"public"."application_tag";