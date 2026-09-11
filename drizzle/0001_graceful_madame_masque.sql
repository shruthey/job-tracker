CREATE TYPE "public"."application_tag" AS ENUM('online_assessment', 'screening_call', 'take_home', 'tech_screen', 'referral', 'recruiter_reachout', 'panel_round', 'system_design', 'offer_negotiation', 'needs_follow_up');--> statement-breakpoint
CREATE TABLE "application_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"tag" "application_tag" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_tags" ADD CONSTRAINT "application_tags_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_tags_application_idx" ON "application_tags" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_tags_tag_idx" ON "application_tags" USING btree ("tag");--> statement-breakpoint
CREATE UNIQUE INDEX "application_tags_unique_idx" ON "application_tags" USING btree ("application_id","tag");