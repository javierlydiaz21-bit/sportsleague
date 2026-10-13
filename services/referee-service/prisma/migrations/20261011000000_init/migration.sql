-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'CONFIRMED', 'DECLINED');

-- CreateTable
CREATE TABLE "referees" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "league_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "zone" TEXT NOT NULL,
    "categories_certified" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referee_availability" (
    "id" UUID NOT NULL,
    "referee_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "referee_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_matches" (
    "match_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "league_name" TEXT,
    "category_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "venue_name" TEXT,
    "venue_zone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "referee_assignments" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "referee_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referees_zone_idx" ON "referees"("zone");

-- CreateIndex
CREATE INDEX "referees_email_idx" ON "referees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "referees_owner_id_email_key" ON "referees"("owner_id", "email");

-- CreateIndex
CREATE INDEX "referee_availability_referee_id_idx" ON "referee_availability"("referee_id");

-- CreateIndex
CREATE INDEX "scheduled_matches_league_id_idx" ON "scheduled_matches"("league_id");

-- CreateIndex
CREATE INDEX "scheduled_matches_scheduled_at_idx" ON "scheduled_matches"("scheduled_at");

-- CreateIndex
CREATE INDEX "referee_assignments_match_id_idx" ON "referee_assignments"("match_id");

-- CreateIndex
CREATE INDEX "referee_assignments_referee_id_idx" ON "referee_assignments"("referee_id");

-- CreateIndex
CREATE UNIQUE INDEX "referee_assignments_match_id_referee_id_key" ON "referee_assignments"("match_id", "referee_id");

-- AddForeignKey
ALTER TABLE "referee_availability" ADD CONSTRAINT "referee_availability_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "referees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_assignments" ADD CONSTRAINT "referee_assignments_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "referees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

