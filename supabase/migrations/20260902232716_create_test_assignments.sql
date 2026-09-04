-- Assign orientador (Prof. Carlos Oliveira) to student Marcos Alan for TCC1
INSERT INTO advisor_assignments (advisor_id, student_id, activity_id)
SELECT
  orientador.id,
  student.id,
  tcc1.id
FROM
  (SELECT id FROM profiles WHERE email = 'orientador@ufra.br') orientador,
  (SELECT id FROM profiles WHERE email = 'alangen30@gmail.com') student,
  (SELECT id FROM activities WHERE code = 'TCC1') tcc1
WHERE NOT EXISTS (
  SELECT 1 FROM advisor_assignments aa
  WHERE aa.advisor_id = orientador.id AND aa.student_id = student.id AND aa.activity_id = tcc1.id
);

-- Assign supervisor (Ana Souza) to student Marcos Alan for ESO1
INSERT INTO supervisor_assignments (supervisor_id, student_id, activity_id)
SELECT
  supervisor.id,
  student.id,
  eso1.id
FROM
  (SELECT id FROM profiles WHERE email = 'supervisor@ufra.br') supervisor,
  (SELECT id FROM profiles WHERE email = 'alangen30@gmail.com') student,
  (SELECT id FROM activities WHERE code = 'ESO1') eso1
WHERE NOT EXISTS (
  SELECT 1 FROM supervisor_assignments sa
  WHERE sa.supervisor_id = supervisor.id AND sa.student_id = student.id AND sa.activity_id = eso1.id
);
