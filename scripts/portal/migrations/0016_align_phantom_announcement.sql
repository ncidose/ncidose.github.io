-- Update the existing archive entry only; do not publish a new announcement,
-- change its original date, or create an email delivery.
UPDATE announcements
SET category='Release',
    body=REPLACE(body, 'We have completed a maintenance update to the pregnant PHANTOM library.',
      'We have completed a scientific correction to the pregnant PHANTOM library.'),
    summary='The pregnant PHANTOM library has been corrected for voxelization boundary clipping and selected breech fetal models. Users who downloaded these files before August 20, 2026 should replace them with the current versions.',
    updated_at=CURRENT_TIMESTAMP
WHERE id='98843c84-b970-423a-954a-7165addd270c'
  AND title='Updated pregnant phantom files are now available'
  AND status='published'
  -- August 20 in America/New_York is stored as August 21 in UTC.
  AND COALESCE(original_published_at, published_at)='2026-08-21 01:25:58';
