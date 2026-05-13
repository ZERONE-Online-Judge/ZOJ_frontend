import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FlowMarker from '@/components/common/FlowMarker';
import { publicStateFlowContent } from '@/data/testContent';

export default function HEPCLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [requested, setRequested] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedOtp = otp.trim().toUpperCase();

    if (normalizedOtp === 'MOSS') {
      navigate('/HEPC_MOSS');
      return;
    }

    if (normalizedOtp === 'COSS') {
      navigate('/HEPC_COSS');
      return;
    }

    setErrorMessage('테스트 OTP는 MOSS 또는 COSS를 입력해주세요.');
  }

  return (
    <main className="mx-6 my-16 flex flex-col gap-8 lg:mx-64">
      <FlowMarker>
        OTP 발급 요청, 오류, 만료, 권한 없음 같은 로그인 주변 상태를 한 화면에서
        확인할 수 있게 추가했습니다.
      </FlowMarker>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded border-2 border-amber-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-3">
            <h1 className="text-3xl font-semibold text-slate-950">
              HEPC 참가 로그인
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              이메일은 아무 값이나 입력해도 됩니다. OTP에 MOSS 또는 COSS를
              입력하면 해당 대회 페이지로 이동합니다.
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
              이메일
              <input
                className="rounded border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-zoj-blue"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="participant@example.com"
                type="email"
                value={email}
              />
            </label>

            <button
              className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
              onClick={() => setRequested(true)}
              type="button"
            >
              OTP 발급 요청 상태 보기
            </button>

            {requested ? (
              <p className="rounded bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                OTP가 이메일로 발급된 상태 예시입니다. 실제 API 연결 전에는
                MOSS/COSS를 직접 입력합니다.
              </p>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
              OTP
              <input
                className="rounded border border-slate-300 px-4 py-3 text-base font-normal tracking-wider outline-none focus:border-zoj-blue"
                onChange={(event) => setOtp(event.target.value)}
                placeholder="MOSS 또는 COSS"
                type="text"
                value={otp}
              />
            </label>

            {errorMessage ? (
              <p className="rounded bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              className="bg-zoj-blue rounded px-5 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              로그인
            </button>
          </form>
        </section>

        <aside className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {publicStateFlowContent.map((state) => (
            <div
              className="rounded border border-amber-200 bg-amber-50 p-5"
              key={state.title}
            >
              <h2 className="text-lg font-semibold text-amber-950">
                {state.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {state.body}
              </p>
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
