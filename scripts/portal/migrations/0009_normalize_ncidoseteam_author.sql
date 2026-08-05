-- The later @ncidoseteam GitHub account represented the same historical
-- maintainer identity as @choonsiklee. Keep a single author label in Q&A.
UPDATE qa_answers
SET author_name = '@choonsiklee',
    updated_at = CURRENT_TIMESTAMP
WHERE lower(author_name) = '@ncidoseteam';

UPDATE qa_questions
SET author_name = '@choonsiklee',
    updated_at = CURRENT_TIMESTAMP
WHERE lower(author_name) = '@ncidoseteam';
