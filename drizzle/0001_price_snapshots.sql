CREATE TABLE "price_snapshot_crawl_runs" (
	"run_id" uuid PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"pages_done" integer DEFAULT 0 NOT NULL,
	"stopped_reason" text,
	"stopped_at_page" integer
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"run_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"variant_key" text NOT NULL,
	"color" text,
	"size" text,
	"price_cents" integer,
	"sale_price_cents" integer,
	"currency" text,
	"in_stock" boolean,
	"status" text NOT NULL,
	"source_url" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	CONSTRAINT "price_snapshots_valid_status" CHECK ("price_snapshots"."status" in ('ok', 'missing_404', 'blocked')),
	CONSTRAINT "price_snapshots_run_id_price_snapshot_crawl_runs_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."price_snapshot_crawl_runs"("run_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "price_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "price_snapshots_run_product_variant_idx" ON "price_snapshots" USING btree ("run_id","product_id","variant_key");--> statement-breakpoint
CREATE INDEX "price_snapshots_product_captured_idx" ON "price_snapshots" USING btree ("product_id","captured_at");