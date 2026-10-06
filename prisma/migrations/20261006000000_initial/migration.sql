-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "cbsaCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "populationLabel" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricObservation" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "medianRent" DOUBLE PRECISION NOT NULL,
    "medianHomeValue" DOUBLE PRECISION NOT NULL,
    "medianIncome" DOUBLE PRECISION NOT NULL,
    "vacancyRate" DOUBLE PRECISION NOT NULL,
    "affordabilityPressure" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MetricObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshRun" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "runStatus" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "RefreshRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_cbsaCode_key" ON "Region"("cbsaCode");

-- CreateIndex
CREATE INDEX "MetricObservation_observationDate_idx" ON "MetricObservation"("observationDate");

-- CreateIndex
CREATE UNIQUE INDEX "MetricObservation_regionId_observationDate_key" ON "MetricObservation"("regionId", "observationDate");

-- AddForeignKey
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
