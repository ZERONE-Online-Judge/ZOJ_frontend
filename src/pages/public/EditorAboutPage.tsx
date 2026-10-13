import { useEffect } from 'react';
import PublicHero from '@/components/common/PublicHero';
import {
  ExperienceArrow,
  ExperienceReveal,
} from '@/components/common/PublicExperience';
import MarkdownPreview from '@/shared/ui/MarkdownPreview';
import './EditorAboutPage.css';

const statement =
  '정수 $N$개로 이루어진 수열 $A$와 기준값 $X$가 주어진다.\n\n수열의 원소 중 $X$보다 작거나 같은 원소의 개수를 구하자.';

function WindowTitle({ title }: { title: string }) {
  return (
    <div className="editor-about-window-title">
      <span className="editor-about-window-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{title}</span>
      <span className="editor-about-example">설명용 예시</span>
    </div>
  );
}

function StatementPreview() {
  return (
    <div className="editor-about-window">
      <WindowTitle title="ZOJ Editor / 기준 이하의 수" />
      <div className="editor-about-workspace">
        <div className="editor-about-sidebar" aria-hidden="true">
          <small>문제 작성</small>
          <span>개요</span>
          <span className="is-selected">지문</span>
          <span>파일 · 리소스</span>
          <span>Checker</span>
          <span>Validator</span>
          <small>테스트 · 검증</small>
          <span>테스트 · 생성 스크립트</span>
          <span>풀이</span>
          <span>실행 결과</span>
        </div>
        <div className="editor-about-statement">
          <div className="editor-about-panel-title">
            <strong>지문</strong>
            <span>한국어</span>
          </div>
          <div className="editor-about-source">
            <small>문제 지문 · LaTeX</small>
            <pre>{statement}</pre>
          </div>
          <div className="editor-about-rendered">
            <small>미리보기</small>
            <MarkdownPreview statement={statement} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TestPreview() {
  return (
    <div className="editor-about-window">
      <WindowTitle title="테스트 · 생성 스크립트" />
      <div className="editor-about-demo-body">
        <div className="editor-about-panel-title">
          <strong>테스트 세트</strong>
          <span>tests</span>
        </div>
        <div className="editor-about-command">
          <small>생성 스크립트</small>
          <code>gen 1000 random 42 &gt; $</code>
        </div>
        <ol
          className="editor-about-test-flow"
          aria-label="입력과 정답 생성 과정"
        >
          {[
            ['01', '입력 생성', 'Generator'],
            ['02', '입력 검사', 'Validator'],
            ['03', '정답 생성', 'Main 풀이'],
            ['04', '결과 확인', '실행 결과'],
          ].map(([number, title, detail]) => (
            <li key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </li>
          ))}
        </ol>
        <div className="editor-about-test-data">
          <div>
            <small>등록 테스트 #1 · 입력</small>
            <pre>{'5 5\n3 8 1 5 9'}</pre>
          </div>
          <div>
            <small>Main 풀이의 출력</small>
            <pre>3</pre>
          </div>
        </div>
        <p className="editor-about-demo-note">
          생성 결과를 확인한 뒤 내 작업 사본에 반영합니다.
        </p>
      </div>
    </div>
  );
}

function VerificationPreview() {
  return (
    <div className="editor-about-window">
      <WindowTitle title="실행 결과 / 풀이 검증" />
      <div className="editor-about-demo-body">
        <div className="editor-about-panel-title">
          <strong>실행 범위</strong>
          <span>tests · 선택한 풀이</span>
        </div>
        <div className="editor-about-verification-table">
          <div className="editor-about-verification-heading">
            <span>풀이</span>
            <span>기대 판정</span>
            <span>실제 판정</span>
          </div>
          {[
            ['main.cpp', '정답', '정답'],
            ['wrong.py', '오답', '오답'],
            ['slow.cpp', '시간 초과', '시간 초과'],
          ].map(([file, expected, actual]) => (
            <div className="editor-about-verification-row" key={file}>
              <strong>{file}</strong>
              <span>{expected}</span>
              <span className={actual === '정답' ? 'is-accepted' : ''}>
                {actual}
              </span>
            </div>
          ))}
        </div>
        <div className="editor-about-verification-result">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>기대 판정과 일치</strong>
            <p>정답 풀이도, 틀려야 하는 풀이도 함께 확인합니다.</p>
          </div>
        </div>
        <p className="editor-about-demo-note">
          실제 작업에서는 테스트별 판정과 시간·메모리, 실행 로그를 확인합니다.
        </p>
      </div>
    </div>
  );
}

function CollaborationPreview() {
  return (
    <div className="editor-about-window">
      <WindowTitle title="리비전 / 함께 완성하는 문제" />
      <div className="editor-about-demo-body">
        <div className="editor-about-revision">
          <span className="editor-about-avatar" aria-hidden="true">
            출
          </span>
          <div>
            <strong>내 작업 사본</strong>
            <p>지문을 다듬고 경계값 테스트를 추가합니다.</p>
          </div>
          <span className="editor-about-revision-tag">작성 중</span>
        </div>
        <div className="editor-about-commit-connector" aria-hidden="true">
          <span /> 커밋으로 공유
        </div>
        <div className="editor-about-revision is-shared">
          <span className="editor-about-avatar" aria-hidden="true">
            r3
          </span>
          <div>
            <strong>경계값 테스트 보강</strong>
            <p>공유 리비전에 변경 이유와 문제 자료를 남깁니다.</p>
          </div>
        </div>
        <div className="editor-about-review-note">
          <span className="editor-about-avatar" aria-hidden="true">
            검
          </span>
          <div>
            <strong>검수 이슈</strong>
            <p>기준값과 같은 원소도 정답에 포함되는지 확인했어요.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorAboutPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="public-experience editor-about-page">
      <PublicHero className="editor-about-hero">
        <div className="experience-hero-grid">
          <div className="experience-hero-copy">
            <p className="experience-eyebrow editor-about-eyebrow">
              <span className="editor-about-new">NEW</span> ZOJ EDITOR
            </p>
            <h1>
              좋은 문제의 시작,
              <br />
              ZOJ Editor<span className="experience-lime">.</span>
            </h1>
            <p className="experience-lead">
              떠오른 아이디어를, 대회에 내보낼 수 있는 문제로.
              <br />
              지문부터 테스트, 검수와 패키지까지 한곳에서 만드세요.
            </p>
            <a className="experience-text-link" href="#editor-writing">
              어떤 공간인지 살펴보기 <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="editor-about-hero-preview">
            <StatementPreview />
            <p className="editor-about-preview-caption">
              실제 Editor의 메뉴와 작업 흐름을 바탕으로 구성한 기능 미리보기
            </p>
          </div>
        </div>
      </PublicHero>

      <section
        className="experience-container experience-section"
        id="editor-writing"
      >
        <ExperienceReveal className="editor-about-feature">
          <div className="editor-about-feature-copy">
            <p className="experience-eyebrow">01 / WRITE YOUR IDEA</p>
            <h2>
              첫 문장부터,
              <br />
              문제답게.
            </h2>
            <p>
              지문·입력·출력·해설을 나누어 작성하고, 아래 미리보기에서 수식과
              문단을 확인하세요. 언어별 지문과 PDF도 준비할 수 있어요.
            </p>
            <ul>
              <li>LaTeX 수식과 지문 미리보기</li>
              <li>언어별 지문·해설·예제 관리</li>
              <li>폴더로 정리하는 나만의 문제 작업 공간</li>
            </ul>
          </div>
          <div className="editor-about-organize">
            <div className="editor-about-folder">
              <span aria-hidden="true">▱</span>
              <strong>다음 대회</strong>
              <span>내 폴더</span>
            </div>
            <div className="editor-about-problem-card">
              <span className="editor-about-problem-symbol" aria-hidden="true">
                A
              </span>
              <div>
                <strong>기준 이하의 수</strong>
                <p>지문 · 테스트 · 풀이</p>
              </div>
              <span className="editor-about-pill">내 문제</span>
            </div>
            <div className="editor-about-language-row">
              <span>한국어 지문</span>
              <span>English</span>
              <span>PDF</span>
            </div>
            <p className="editor-about-demo-note">
              문제는 폴더로 끌어 놓거나, 여러 개를 선택해 함께 옮길 수 있어요.
            </p>
          </div>
        </ExperienceReveal>
      </section>

      <section className="experience-soft-section">
        <div className="experience-container experience-section">
          <ExperienceReveal className="editor-about-feature is-reversed">
            <div className="editor-about-feature-copy">
              <p className="experience-eyebrow">02 / BUILD YOUR TESTS</p>
              <h2>
                작은 예제부터,
                <br />
                놓치기 쉬운 경계까지.
              </h2>
              <p>
                직접 입력하거나 생성 스크립트로 테스트를 준비하세요. 선택한
                테스트 세트의 입력을 Validator로 검사하고, Main 풀이를 실행해
                정답을 만듭니다.
              </p>
              <ul>
                <li>테스트 세트·그룹·지문 예제를 구분해 관리</li>
                <li>Generator · Validator · Checker와 testlib 지원</li>
                <li>생성 결과를 확인한 뒤 작업 사본에 반영</li>
              </ul>
            </div>
            <TestPreview />
          </ExperienceReveal>
        </div>
      </section>

      <section className="experience-container experience-section">
        <ExperienceReveal className="editor-about-feature">
          <div className="editor-about-feature-copy">
            <p className="experience-eyebrow">
              03 / CHECK MORE THAN THE ANSWER
            </p>
            <h2>
              맞는 풀이는 맞게,
              <br />
              틀린 풀이는 틀리게.
            </h2>
            <p>
              풀이마다 기대 판정을 정하고, 실행할 풀이와 테스트 범위를 고르세요.
              ZOJ 실제 채점기로 대회와 같은 환경의 판정과 실행 자원도 확인할 수
              있어요.
            </p>
            <ul>
              <li>정답·오답·시간 초과·메모리 초과 풀이 검증</li>
              <li>여러 풀이를 같은 입력으로 비교하는 스트레스 테스트</li>
              <li>유효한 반례를 모아 원하는 테스트만 추가</li>
            </ul>
            <p className="editor-about-caution">
              등록 테스트 통과는 모든 입력에서 정답이라는 증명은 아니에요. 기대
              판정과 반례를 함께 살펴 테스트를 보강하세요.
            </p>
          </div>
          <VerificationPreview />
        </ExperienceReveal>
      </section>

      <section className="experience-soft-section">
        <div className="experience-container experience-section">
          <ExperienceReveal className="editor-about-feature is-reversed">
            <div className="editor-about-feature-copy">
              <p className="experience-eyebrow">04 / MAKE IT BETTER TOGETHER</p>
              <h2>
                혼자 다듬고,
                <br />
                함께 완성해요.
              </h2>
              <p>
                내 작업 사본에서 준비한 변경을 커밋하면 동료와 공유됩니다.
                리비전으로 변경을 돌아보고, 이슈로 검수 의견을 남기세요.
                읽기·쓰기 권한과 검수자 역할에 맞춰 함께 작업할 수 있어요.
              </p>
              <ul>
                <li>이메일 또는 Editor 아이디로 협업자 추가</li>
                <li>자료 수정 없이 커밋된 리비전을 검증하는 검수자</li>
                <li>변경 내용·실행 기록·검수 의견을 서버에 보관</li>
              </ul>
            </div>
            <CollaborationPreview />
          </ExperienceReveal>
        </div>
      </section>

      <section className="experience-container experience-section editor-about-publish">
        <ExperienceReveal>
          <p className="experience-eyebrow">
            05 / FROM YOUR WORKSPACE TO THE CONTEST
          </p>
          <h2>
            완성한 문제를,
            <br />
            다음 대회로.
          </h2>
          <p className="editor-about-publish-copy">
            커밋된 문제를 검증해 패키지로 내보내세요. 지문·테스트·풀이·채점
            파일을 함께 담고, ZOJ에 등록할 준비를 마칩니다.
          </p>
          <div className="editor-about-publish-options">
            <article>
              <span className="editor-about-publish-symbol" aria-hidden="true">
                ZIP
              </span>
              <h3>패키지로 내보내기</h3>
              <p>
                ZOJ 문제 ZIP 또는 Editor / Polygon 형식으로 작업 자료를
                내보내고, 패키지를 다시 가져올 수 있어요.
              </p>
              <span className="editor-about-pill">자료를 한 번에</span>
            </article>
            <article>
              <span className="editor-about-publish-symbol" aria-hidden="true">
                ↗
              </span>
              <h3>ZOJ에 바로 등록하기</h3>
              <p>
                문제 소유자는 검증된 ZOJ 패키지를 선택하고, 업로드 권한이 있는
                대회의 참가 유형과 문제 번호를 지정해 등록해요.
              </p>
              <span className="editor-about-pill">내 문제에서 내 대회로</span>
            </article>
          </div>
        </ExperienceReveal>
      </section>

      <section className="editor-about-cta">
        <ExperienceReveal className="experience-container">
          <p className="experience-eyebrow">YOUR NEXT PROBLEM STARTS HERE</p>
          <h2>
            다음 문제의 첫 줄,
            <br />
            여기서 시작해 보세요.
          </h2>
          <p>ZOJ 로그인으로 들어와, 나만의 문제 작업 공간을 만나보세요.</p>
          <a className="experience-button is-lime" href="https://editor.zoj.kr">
            ZOJ Editor로 이동 <ExperienceArrow />
          </a>
          <span className="editor-about-cta-wordmark" aria-hidden="true">
            IDEA → PROBLEM
          </span>
        </ExperienceReveal>
      </section>
    </div>
  );
}
