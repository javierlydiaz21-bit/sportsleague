-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "match_results" (
    "match_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "events" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "goals_for" INTEGER NOT NULL,
    "goals_against" INTEGER NOT NULL,
    "goal_difference" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "form" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "top_scorers" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "goals" INTEGER NOT NULL,

    CONSTRAINT "top_scorers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinary_records" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "yellow_cards" INTEGER NOT NULL,
    "red_cards" INTEGER NOT NULL,

    CONSTRAINT "disciplinary_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_results_season_id_category_id_idx" ON "match_results"("season_id", "category_id");

-- CreateIndex
CREATE INDEX "standings_season_id_team_id_idx" ON "standings"("season_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "standings_season_id_category_id_team_id_key" ON "standings"("season_id", "category_id", "team_id");

-- CreateIndex
CREATE INDEX "top_scorers_season_id_goals_idx" ON "top_scorers"("season_id", "goals");

-- CreateIndex
CREATE UNIQUE INDEX "top_scorers_season_id_category_id_player_id_key" ON "top_scorers"("season_id", "category_id", "player_id");

-- CreateIndex
CREATE INDEX "disciplinary_records_player_id_idx" ON "disciplinary_records"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinary_records_season_id_category_id_player_id_key" ON "disciplinary_records"("season_id", "category_id", "player_id");

