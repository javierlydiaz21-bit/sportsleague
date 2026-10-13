-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "attendance_estimates" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "estimated_attendance" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspended_matches" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "reason" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suspended_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_performance_trend" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "match_index" INTEGER NOT NULL,
    "match_id" UUID NOT NULL,
    "result" TEXT NOT NULL,
    "points_cumulative" INTEGER NOT NULL,
    "goal_difference_cumulative" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_performance_trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_kpis" (
    "league_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "total_matches" INTEGER NOT NULL,
    "scheduled" INTEGER NOT NULL,
    "live" INTEGER NOT NULL,
    "finished" INTEGER NOT NULL,
    "suspended" INTEGER NOT NULL,
    "total_goals" INTEGER NOT NULL,
    "total_cards" INTEGER NOT NULL,
    "avg_goals_per_match" DOUBLE PRECISION NOT NULL,
    "avg_attendance" DOUBLE PRECISION NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_kpis_pkey" PRIMARY KEY ("league_id")
);

-- CreateTable
CREATE TABLE "etl_runs" (
    "id" UUID NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "rows_processed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "etl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_estimates_match_id_key" ON "attendance_estimates"("match_id");

-- CreateIndex
CREATE INDEX "attendance_estimates_league_id_idx" ON "attendance_estimates"("league_id");

-- CreateIndex
CREATE UNIQUE INDEX "suspended_matches_match_id_key" ON "suspended_matches"("match_id");

-- CreateIndex
CREATE INDEX "suspended_matches_league_id_idx" ON "suspended_matches"("league_id");

-- CreateIndex
CREATE INDEX "team_performance_trend_team_id_season_id_idx" ON "team_performance_trend"("team_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_performance_trend_team_id_season_id_match_index_key" ON "team_performance_trend"("team_id", "season_id", "match_index");

-- CreateIndex
CREATE INDEX "etl_runs_started_at_idx" ON "etl_runs"("started_at");

