-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "fixtures" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "status" "FixtureStatus" NOT NULL DEFAULT 'DRAFT',
    "double_round" BOOLEAN NOT NULL DEFAULT false,
    "total_rounds" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "fixture_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "venue_id" UUID,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "suspension_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_season_id_category_id_key" ON "fixtures"("season_id", "category_id");

-- CreateIndex
CREATE INDEX "matches_season_id_scheduled_at_idx" ON "matches"("season_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_category_id_idx" ON "matches"("category_id");

-- CreateIndex
CREATE INDEX "matches_league_id_idx" ON "matches"("league_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

