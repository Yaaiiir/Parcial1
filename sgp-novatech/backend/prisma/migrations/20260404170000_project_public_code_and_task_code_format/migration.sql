ALTER TABLE "projects" ADD COLUMN "publicCode" TEXT;

WITH ordered_projects AS (
  SELECT
    "id",
    printf('PRJ-%03d', ROW_NUMBER() OVER (ORDER BY "createdAt", "id")) AS "code"
  FROM "projects"
)
UPDATE "projects"
SET "publicCode" = (
  SELECT "code"
  FROM ordered_projects
  WHERE ordered_projects."id" = "projects"."id"
)
WHERE "publicCode" IS NULL;

WITH ordered_tasks AS (
  SELECT
    t."id",
    printf(
      'TSK-%s-%03d',
      REPLACE(p."publicCode", 'PRJ-', ''),
      ROW_NUMBER() OVER (PARTITION BY t."projectId" ORDER BY t."createdAt", t."id")
    ) AS "code"
  FROM "tasks" t
  INNER JOIN "projects" p
    ON p."id" = t."projectId"
)
UPDATE "tasks"
SET "publicCode" = (
  SELECT "code"
  FROM ordered_tasks
  WHERE ordered_tasks."id" = "tasks"."id"
)
WHERE "publicCode" IS NULL OR "publicCode" NOT LIKE 'TSK-%-%';

CREATE UNIQUE INDEX "projects_publicCode_key" ON "projects"("publicCode");
