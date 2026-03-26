/*
  FeasibilityReviews NVARCHAR -> FLOAT migration helper (Azure SQL / SQL Server)
  - Audits invalid values
  - Cleans data safely
  - Converts columns to FLOAT NULL
*/

BEGIN TRANSACTION;

/* 1) Audit invalid values before cleaning */
WITH Raw AS (
  SELECT
    id,
    setupCosts,
    annualOngoingCost,
    setupResources,
    annualOngoingResources,
    additionalResources
  FROM dbo.FeasibilityReviews
),
Normalised AS (
  SELECT
    id,
    setupCosts,
    annualOngoingCost,
    setupResources,
    annualOngoingResources,
    additionalResources,
    NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), setupCosts), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS setupCosts_clean,
    NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), annualOngoingCost), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS annualOngoingCost_clean,
    NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), setupResources), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS setupResources_clean,
    NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), annualOngoingResources), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS annualOngoingResources_clean,
    NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), additionalResources), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS additionalResources_clean
  FROM Raw
)
SELECT id, column_name, original_value, cleaned_value
FROM (
  SELECT id, 'setupCosts' AS column_name, setupCosts AS original_value, setupCosts_clean AS cleaned_value,
         TRY_CONVERT(FLOAT, setupCosts_clean) AS numeric_value
  FROM Normalised
  WHERE setupCosts IS NOT NULL

  UNION ALL

  SELECT id, 'annualOngoingCost', annualOngoingCost, annualOngoingCost_clean,
         TRY_CONVERT(FLOAT, annualOngoingCost_clean)
  FROM Normalised
  WHERE annualOngoingCost IS NOT NULL

  UNION ALL

  SELECT id, 'setupResources', setupResources, setupResources_clean,
         TRY_CONVERT(FLOAT, setupResources_clean)
  FROM Normalised
  WHERE setupResources IS NOT NULL

  UNION ALL

  SELECT id, 'annualOngoingResources', annualOngoingResources, annualOngoingResources_clean,
         TRY_CONVERT(FLOAT, annualOngoingResources_clean)
  FROM Normalised
  WHERE annualOngoingResources IS NOT NULL

  UNION ALL

  SELECT id, 'additionalResources', additionalResources, additionalResources_clean,
         TRY_CONVERT(FLOAT, additionalResources_clean)
  FROM Normalised
  WHERE additionalResources IS NOT NULL
) x
WHERE cleaned_value IS NULL OR numeric_value IS NULL
ORDER BY column_name, id;

/* 2) Clean each column: strip common symbols, preserve numeric strings, null invalid values */
UPDATE dbo.FeasibilityReviews
SET setupCosts = CASE
  WHEN c.clean_value IS NULL THEN NULL
  WHEN TRY_CONVERT(FLOAT, c.clean_value) IS NULL THEN NULL
  ELSE c.clean_value
END
FROM dbo.FeasibilityReviews fr
CROSS APPLY (
  SELECT NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), fr.setupCosts), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS clean_value
) c;

UPDATE dbo.FeasibilityReviews
SET annualOngoingCost = CASE
  WHEN c.clean_value IS NULL THEN NULL
  WHEN TRY_CONVERT(FLOAT, c.clean_value) IS NULL THEN NULL
  ELSE c.clean_value
END
FROM dbo.FeasibilityReviews fr
CROSS APPLY (
  SELECT NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), fr.annualOngoingCost), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS clean_value
) c;

UPDATE dbo.FeasibilityReviews
SET setupResources = CASE
  WHEN c.clean_value IS NULL THEN NULL
  WHEN TRY_CONVERT(FLOAT, c.clean_value) IS NULL THEN NULL
  ELSE c.clean_value
END
FROM dbo.FeasibilityReviews fr
CROSS APPLY (
  SELECT NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), fr.setupResources), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS clean_value
) c;

UPDATE dbo.FeasibilityReviews
SET annualOngoingResources = CASE
  WHEN c.clean_value IS NULL THEN NULL
  WHEN TRY_CONVERT(FLOAT, c.clean_value) IS NULL THEN NULL
  ELSE c.clean_value
END
FROM dbo.FeasibilityReviews fr
CROSS APPLY (
  SELECT NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), fr.annualOngoingResources), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS clean_value
) c;

UPDATE dbo.FeasibilityReviews
SET additionalResources = CASE
  WHEN c.clean_value IS NULL THEN NULL
  WHEN TRY_CONVERT(FLOAT, c.clean_value) IS NULL THEN NULL
  ELSE c.clean_value
END
FROM dbo.FeasibilityReviews fr
CROSS APPLY (
  SELECT NULLIF(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(255), fr.additionalResources), N'£', N''), N'$', N''), N',', N''), NCHAR(160), N''), CHAR(9), N''), CHAR(13), N''), CHAR(10), N''))), N'') AS clean_value
) c;

/* 3) Convert columns to FLOAT NULL */
ALTER TABLE dbo.FeasibilityReviews ALTER COLUMN setupCosts FLOAT NULL;
ALTER TABLE dbo.FeasibilityReviews ALTER COLUMN annualOngoingCost FLOAT NULL;
ALTER TABLE dbo.FeasibilityReviews ALTER COLUMN setupResources FLOAT NULL;
ALTER TABLE dbo.FeasibilityReviews ALTER COLUMN annualOngoingResources FLOAT NULL;
ALTER TABLE dbo.FeasibilityReviews ALTER COLUMN additionalResources FLOAT NULL;

COMMIT TRANSACTION;
