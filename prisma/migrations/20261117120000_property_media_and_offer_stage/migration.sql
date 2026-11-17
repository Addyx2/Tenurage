-- idempotent: safe to re-run
-- Property photos and a video tour, and an applicant's stage once an offer is made.
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "offerStage" TEXT;
