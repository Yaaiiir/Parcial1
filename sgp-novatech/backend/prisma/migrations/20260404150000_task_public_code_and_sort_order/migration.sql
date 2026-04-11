ALTER TABLE "tasks" ADD COLUMN "publicCode" TEXT;
ALTER TABLE "tasks" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered_codes AS (
  SELECT
    "id",
    printf('TSK-%03d', ROW_NUMBER() OVER (ORDER BY "createdAt", "id")) AS "code"
  FROM "tasks"
)
UPDATE "tasks"
SET "publicCode" = (
  SELECT "code"
  FROM ordered_codes
  WHERE ordered_codes."id" = "tasks"."id"
);

WITH ordered_positions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "projectId", "status"
      ORDER BY "createdAt", "id"
    ) - 1 AS "position"
  FROM "tasks"
)
UPDATE "tasks"
SET "sortOrder" = (
  SELECT "position"
  FROM ordered_positions
  WHERE ordered_positions."id" = "tasks"."id"
);

CREATE UNIQUE INDEX "tasks_publicCode_key" ON "tasks"("publicCode");
