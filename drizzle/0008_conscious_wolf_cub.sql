ALTER TABLE "application_tags" ALTER COLUMN "tag" SET DATA TYPE text;--> statement-breakpoint
--> The `referral_requested` and `referral_given` tags became board columns, so
--> the signal they carried moves to `applications.status` before the rows go.
--> Promote only applications still sitting in `saved`: anything further along
--> already tells a later part of the story, and moving it back to a referral
--> stage would lose that.
--> `referral_given` is applied second so it wins where an application carries
--> both tags -- being given a referral is the later of the two.
UPDATE "applications" SET "status" = 'referral_requested'
  WHERE "status" = 'saved'
    AND "id" IN (
      SELECT "application_id" FROM "application_tags"
      WHERE "tag" = 'referral_requested'
    );--> statement-breakpoint
UPDATE "applications" SET "status" = 'referral_given'
  WHERE "status" = 'saved'
    AND "id" IN (
      SELECT "application_id" FROM "application_tags"
      WHERE "tag" = 'referral_given'
    );--> statement-breakpoint
--> The board and the analytics funnel both read history from `status_events`,
--> not just the current status, so a promotion that leaves no event behind
--> would be invisible to them. One event per application promoted above, from
--> `saved` to wherever it landed.
INSERT INTO "status_events" ("application_id", "from_status", "to_status", "source", "note", "occurred_at")
  SELECT "id", 'saved', "status", 'system',
         'Migrated from the referral tag of the same name.', now()
  FROM "applications"
  WHERE "status" IN ('referral_requested', 'referral_given');--> statement-breakpoint
--> Now the tags themselves. Deleted while the column is still text: the cast
--> back to the new enum at the end fails on any row still holding a value the
--> new type does not have.
DELETE FROM "application_tags" WHERE "tag" IN ('referral_requested', 'referral_given');--> statement-breakpoint
DROP TYPE "public"."application_tag";--> statement-breakpoint
CREATE TYPE "public"."application_tag" AS ENUM('online_assessment', 'screening_call', 'take_home', 'tech_screen', 'recruiter_reachout', 'panel_round', 'system_design', 'offer_negotiation', 'needs_follow_up', 'need_referral');--> statement-breakpoint
ALTER TABLE "application_tags" ALTER COLUMN "tag" SET DATA TYPE "public"."application_tag" USING "tag"::"public"."application_tag";
