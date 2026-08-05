ALTER TABLE users ADD COLUMN discussion_role TEXT NOT NULL DEFAULT 'community'
  CHECK (discussion_role IN ('community', 'team'));
ALTER TABLE users ADD COLUMN discussion_handle TEXT;

ALTER TABLE qa_questions ADD COLUMN author_type TEXT NOT NULL DEFAULT 'community'
  CHECK (author_type IN ('community', 'team'));

UPDATE users
SET discussion_role='team',
    discussion_handle=CASE
      WHEN EXISTS (
        SELECT 1 FROM user_identities identities
        WHERE identities.user_id=users.id
          AND identities.normalized_email='choonsiklee@gmail.com'
      ) THEN 'choonsiklee'
      ELSE discussion_handle
    END,
    updated_at=CURRENT_TIMESTAMP
WHERE role='admin';

UPDATE qa_questions
SET author_type='team', updated_at=CURRENT_TIMESTAMP
WHERE lower(author_name) IN ('@choonsiklee', '@haeginh', '@sstreitmatter');
