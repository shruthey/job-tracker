CREATE TYPE "public"."company_pipeline" AS ENUM('interested', 'researching', 'passed');--> statement-breakpoint
CREATE TYPE "public"."company_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "pipeline" "company_pipeline";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "priority" "company_priority";