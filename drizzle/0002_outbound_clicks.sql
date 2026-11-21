CREATE TABLE "outbound_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"locale" text NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referer" text,
	"target" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "outbound_clicks_sku_clicked_idx" ON "outbound_clicks" USING btree ("sku","clicked_at");