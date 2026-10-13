-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('LIVE', 'FINISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION');

-- CreateTable
CREATE TABLE "live_matches" (
    "match_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "status" "LiveStatus" NOT NULL DEFAULT 'LIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "attendance" INTEGER,
    "peak_viewers" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "live_matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "type" "EventType" NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID,
    "player_in_id" UUID,
    "minute" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_matches_league_id_idx" ON "live_matches"("league_id");

-- CreateIndex
CREATE INDEX "live_matches_season_id_category_id_idx" ON "live_matches"("season_id", "category_id");

-- CreateIndex
CREATE INDEX "live_matches_status_idx" ON "live_matches"("status");

-- CreateIndex
CREATE INDEX "match_events_match_id_idx" ON "match_events"("match_id");

-- CreateIndex
CREATE INDEX "match_events_match_id_minute_idx" ON "match_events"("match_id", "minute");

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "live_matches"("match_id") ON DELETE CASCADE ON UPDATE CASCADE;

