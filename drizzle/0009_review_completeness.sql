-- Existing agreement is not evidence that all acceptance criteria were met.
-- Preserve review text, votes and all historical acceptance records.
ALTER TABLE verifications ADD completeness text NOT NULL DEFAULT 'unknown'
 CHECK (completeness IN ('unknown','partial','complete'));
