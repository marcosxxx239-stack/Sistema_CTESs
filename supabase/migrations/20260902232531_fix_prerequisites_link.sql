-- Link ESO2 → ESO1 and TCC2 → TCC1 prerequisites
-- ESO2 requires ESO1 to be finalizado
UPDATE activities
SET prerequisite_activity_id = (
  SELECT id FROM activities WHERE code = 'ESO1' LIMIT 1
)
WHERE code = 'ESO2';

-- TCC2 requires TCC1 to be finalizado
UPDATE activities
SET prerequisite_activity_id = (
  SELECT id FROM activities WHERE code = 'TCC1' LIMIT 1
)
WHERE code = 'TCC2';
