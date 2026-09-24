const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(
  __dirname,
  '../src/domains/serviceCommunication/boardPresentation.ts',
);
const loaded = new Module(filename, module);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const { hasOperatorAnswer, matchesQuestionSearch } = loaded.exports;

test('participant follow-ups do not mark a question answered by an operator', () => {
  const question = { answers: [] };
  assert.equal(hasOperatorAnswer(question), false);
  question.answers.push({ created_by_role: 'participant' });
  assert.equal(hasOperatorAnswer(question), false);
  question.answers.push({ created_by_role: 'operator' });
  assert.equal(hasOperatorAnswer(question), true);
});

test('board search finds multiple words across author, team, question and replies', () => {
  const question = {
    title: '출력 형식',
    body: '줄바꿈 질문',
    author_name: '김참가',
    author_email: 'Team@Example.com',
    team_name: '초등 알고리즘 팀',
    answers: [{ body: '마지막 공백은 허용됩니다.' }],
  };
  assert.equal(matchesQuestionSearch(question, '  김참가 줄바꿈  '), true);
  assert.equal(matchesQuestionSearch(question, 'TEAM@example.com 공백'), true);
  assert.equal(matchesQuestionSearch(question, '초등 없는문장'), false);
  assert.equal(matchesQuestionSearch(question, '   '), true);
  assert.equal(
    matchesQuestionSearch({ title: '제목', answers: [] }, '미등록'),
    false,
  );
});
