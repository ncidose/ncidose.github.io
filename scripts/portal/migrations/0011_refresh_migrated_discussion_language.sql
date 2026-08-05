UPDATE qa_questions
SET body='Feature requests collected from the NCI Dose Tools user community. Community requests and NCI Dose Team status updates are identified below.',
    updated_at=CURRENT_TIMESTAMP
WHERE id IN ('github-31', 'github-34', 'github-36', 'github-39')
  AND body='Requests collected from the former GitHub Discussions feature-request threads. Community requests and NCI Dose Team status updates are identified below.';

UPDATE qa_answers
SET body='The full body size-dependent phantom library (n = 362) is available through the secure NCI Dose Tools User Portal for users with an approved Software Transfer Agreement.',
    updated_at=CURRENT_TIMESTAMP
WHERE id='github-DC_kwDONcuSIs4AsESJ';

UPDATE qa_answers
SET body=REPLACE(
      body,
      'the original voxel phantoms available in the Google Drive repository.',
      'the original voxel phantoms available through the secure NCI Dose Tools User Portal.'
    ),
    updated_at=CURRENT_TIMESTAMP
WHERE id='github-DC_kwDONcuSIs4A8Lxf';

UPDATE qa_answers
SET body=REPLACE(
      REPLACE(
        body,
        'the full size-dependent phantom library available here:',
        'the full size-dependent phantom library available through the secure NCI Dose Tools User Portal for approved users:'
      ),
      'https://drive.google.com/drive/folders/1WUBog3LP2wNGPSl6wXVzniKOVr1KH_6z?usp=share_link',
      'https://portal.ncidosetools.com'
    ),
    updated_at=CURRENT_TIMESTAMP
WHERE id='github-DC_kwDONcuSIs4A8Yma';
