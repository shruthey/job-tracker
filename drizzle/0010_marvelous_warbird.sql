ALTER TABLE "application_tags" ALTER COLUMN "tag" SET DATA TYPE text;--> statement-breakpoint
--> These five tags are retired outright. Unlike the referral tags in 0008
--> there is no status that carries the same meaning, so the rows are simply
--> dropped rather than promoted anywhere.
--> Deleted while the column is still text: the cast back to the new enum at
--> the end fails on any row holding a value the new type does not have.
DELETE FROM "application_tags"
  WHERE "tag" IN (
    'take_home', 'panel_round', 'tech_screen', 'system_design',
    'recruiter_reachout'
  );--> statement-breakpoint
DROP TYPE "public"."application_tag";--> statement-breakpoint
CREATE TYPE "public"."application_tag" AS ENUM('online_assessment', 'screening_call', 'offer_negotiation', 'needs_follow_up', 'need_referral', 'update_resume');--> statement-breakpoint
ALTER TABLE "application_tags" ALTER COLUMN "tag" SET DATA TYPE "public"."application_tag" USING "tag"::"public"."application_tag";