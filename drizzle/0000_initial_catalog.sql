CREATE TYPE "public"."product_status" AS ENUM('active', 'discontinued', 'pending_review');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('auto_applied', 'needs_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."spec_source" AS ENUM('brand', 'not_published');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"website" text NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"field" text NOT NULL,
	"old" jsonb,
	"new" jsonb,
	"detected_at" timestamp with time zone NOT NULL,
	"status" "review_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"started" timestamp with time zone NOT NULL,
	"finished" timestamp with time zone,
	"pages_ok" integer DEFAULT 0 NOT NULL,
	"pages_failed" integer DEFAULT 0 NOT NULL,
	"stopped_reason" text
);
--> statement-breakpoint
CREATE TABLE "manual_overrides" (
	"product_id" integer NOT NULL,
	"field" text NOT NULL,
	"value" jsonb,
	CONSTRAINT "manual_overrides_product_id_field_pk" PRIMARY KEY("product_id","field")
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"channel" text DEFAULT 'brand_us' NOT NULL,
	"price" numeric(12, 2),
	"currency" text,
	"in_stock" boolean,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "prices_product_id_channel_variant_fetched_at_unique" UNIQUE("product_id","channel","variant","fetched_at")
);
--> statement-breakpoint
CREATE TABLE "product_raw" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_specs" (
	"product_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"unit" text,
	"source" "spec_source" NOT NULL,
	"source_url" text NOT NULL,
	"raw_text" text,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "product_specs_product_id_key_pk" PRIMARY KEY("product_id","key")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"sub_tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"gender" text,
	"analytics_family" text,
	"is_hardshell" boolean DEFAULT false NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"successor_id" integer,
	"predecessor_id" integer,
	"first_seen" timestamp with time zone NOT NULL,
	"last_seen" timestamp with time zone NOT NULL,
	"consecutive_misses" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_brand_id_external_id_unique" UNIQUE("brand_id","external_id"),
	CONSTRAINT "nonnegative_misses" CHECK ("products"."consecutive_misses" >= 0)
);
--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_raw" ADD CONSTRAINT "product_raw_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_successor_id_products_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_predecessor_id_products_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changes_product_id_field_status_index" ON "changes" USING btree ("product_id","field","status");--> statement-breakpoint
CREATE INDEX "crawl_runs_brand_id_started_index" ON "crawl_runs" USING btree ("brand_id","started");--> statement-breakpoint
CREATE INDEX "products_category_name_index" ON "products" USING btree ("category","name");--> statement-breakpoint
CREATE INDEX "products_is_hardshell_name_index" ON "products" USING btree ("is_hardshell","name");