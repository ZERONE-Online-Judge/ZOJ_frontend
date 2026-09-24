import type { ContestQuestion } from './types';

export function hasOperatorAnswer(question: ContestQuestion) {
  return question.answers.some(
    (answer) => answer.created_by_role === 'operator',
  );
}

export function matchesQuestionSearch(
  question: ContestQuestion,
  query: string,
) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = [
    question.title,
    question.body,
    question.author_name,
    question.author_email,
    question.team_name,
    question.division_name,
    ...question.answers.map((answer) => answer.body),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}
