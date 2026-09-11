ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'saved'::text;--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."application_status";--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('saved', 'applied', 'screen', 'interview', 'onsite', 'offer', 'rejected', 'withdrawn', 'ghosted');--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'saved'::"public"."application_status";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "from_status" SET DATA TYPE "public"."application_status" USING "from_status"::"public"."application_status";--> statement-breakpoint
ALTER TABLE "status_events" ALTER COLUMN "to_status" SET DATA TYPE "public"."application_status" USING "to_status"::"public"."application_status";