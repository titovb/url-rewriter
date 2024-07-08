CREATE TABLE IF NOT EXISTS "url_rewrites" (
	"id" serial PRIMARY KEY NOT NULL,
	"old_url" text NOT NULL,
	"new_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "url_rewrites_old_url_unique" UNIQUE("old_url"),
	CONSTRAINT "url_rewrites_new_url_unique" UNIQUE("new_url")
);
