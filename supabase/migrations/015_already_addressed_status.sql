-- Add 'already_addressed' status to learning_proposals and unanswered_questions
-- Used when a proposal/question references a topic already covered in the KB

ALTER TABLE learning_proposals DROP CONSTRAINT IF EXISTS learning_proposals_status_check;
ALTER TABLE learning_proposals ADD CONSTRAINT learning_proposals_status_check
  CHECK (status = ANY (ARRAY['pending', 'approved', 'dismissed', 'already_addressed']));

ALTER TABLE unanswered_questions DROP CONSTRAINT IF EXISTS unanswered_questions_status_check;
ALTER TABLE unanswered_questions ADD CONSTRAINT unanswered_questions_status_check
  CHECK (status = ANY (ARRAY['pending', 'answered', 'dismissed', 'already_addressed']));
