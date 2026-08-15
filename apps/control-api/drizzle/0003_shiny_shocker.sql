CREATE TYPE "public"."alert_metric_name" AS ENUM('CLS', 'FCP', 'INP', 'LCP', 'TTFB');--> statement-breakpoint
ALTER TYPE "public"."alert_rule_type" ADD VALUE 'error_spike';--> statement-breakpoint
ALTER TYPE "public"."alert_rule_type" ADD VALUE 'performance_regression';--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "window_minutes" integer;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "threshold_count" integer;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "metric_name" "alert_metric_name";--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "threshold_value" double precision;