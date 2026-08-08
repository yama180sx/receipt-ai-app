-- Issue #114-10: 世帯別カテゴリを標準カテゴリ名「交通・通信」へ統一する。
-- 両カテゴリが同一世帯に存在する場合は、既存の「交通・通信」を正とする。
UPDATE "Item" AS item
SET "categoryId" = target."id"
FROM "Category" AS legacy
INNER JOIN "Category" AS target
  ON target."familyGroupId" = legacy."familyGroupId"
 AND target."name" = '交通・通信'
WHERE item."categoryId" = legacy."id"
  AND legacy."name" = '交通費';

DELETE FROM "Category" AS legacy
USING "Category" AS target
WHERE legacy."familyGroupId" = target."familyGroupId"
  AND legacy."name" = '交通費'
  AND target."name" = '交通・通信';

UPDATE "Category"
SET "name" = '交通・通信'
WHERE "name" = '交通費';
