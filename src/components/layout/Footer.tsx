import backgroundLogoUrl from '@/assets/logos/background-logo.png';
import { SvgIcon } from '@/utils/Icons';

const footerPolicies = [
  { label: '이용안내', href: '/support' },
  { label: '개인정보처리방침', href: '/support' },
  { label: '서비스 문의', href: 'mailto:zoj.service@gmail.com' },
] as const;

const footerPeople = [
  {
    role: 'Infra & DevOps',
    name: '손 동열',
    email: 'sdy423@hanyang.ac.kr',
  },
  {
    role: 'Design',
    name: '조 영은',
    email: 'fgfg1025@hanyang.ac.kr',
  },
  {
    role: 'Design',
    name: '여 지훈',
    email: '미공개',
  },
  {
    role: 'Backend',
    name: '손 동열',
    email: 'sdy423@hanyang.ac.kr',
  },
  {
    role: 'Frontend',
    name: '조 성민',
    email: 'sjo480524@hanyang.ac.kr',
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-0">
        <section className="grid gap-12 bg-slate-100 px-6 py-12 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
          <div className="grid gap-8">
            <div className="flex items-center gap-4">
              <img
                alt=""
                aria-hidden="true"
                className="size-12 object-contain opacity-75 grayscale"
                src={backgroundLogoUrl}
              />
              <div>
                <p className="text-xl font-black tracking-normal text-slate-700">
                  Zerone Online Judge
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Programming Contest Platform
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {footerPeople.map((person) => (
                  <div
                    className="grid gap-1 border-l-2 border-slate-300 pl-4"
                    key={person.role}
                  >
                    <span className="text-xs font-black text-slate-500">
                      {person.role}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {person.name}
                    </span>
                    <a
                      className="text-sm font-bold break-all text-slate-600 underline-offset-4 transition hover:text-zoj-blue hover:underline"
                      href={`mailto:${person.email}`}
                    >
                      {person.email}
                    </a>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 text-sm leading-7 font-semibold text-slate-600">
              <p>
                서비스 관련 문의{' '}
                <a
                  className="font-black text-slate-900 underline-offset-4 hover:text-zoj-blue hover:underline"
                  href="mailto:zoj.service@gmail.com"
                >
                  zoj.service@gmail.com
                </a>
              </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:min-w-72 md:items-end md:justify-center">
            <div className="grid gap-3 text-sm font-black text-slate-800">
              <a
                className="inline-flex items-center gap-2 transition hover:text-zoj-blue"
                href="/support"
              >
                이용안내
                <span className="text-xl text-slate-400">›</span>
              </a>
              <a
                className="inline-flex items-center gap-2 transition hover:text-zoj-blue"
                href="mailto:zoj.service@gmail.com"
              >
                서비스 문의
                <span className="text-xl text-slate-400">›</span>
              </a>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                aria-label="GitHub 열기"
                className="inline-flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:text-zoj-blue"
                href="https://github.com/ZERONE-Online-Judge"
                rel="noreferrer"
                target="_blank"
              >
                <SvgIcon name="github" size={24} />
              </a>
              <a
                aria-label="문의 메일 보내기"
                className="inline-flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:text-zoj-blue"
                href="mailto:zoj.service@gmail.com"
              >
                @
              </a>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-slate-200 bg-slate-100 px-6 py-6 text-sm font-bold text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {footerPolicies.map((policy, index) => (
              <a
                className={[
                  'transition hover:text-zoj-blue',
                  index === 1 ? 'text-slate-800' : '',
                ].join(' ')}
                href={policy.href}
                key={policy.label}
              >
                {policy.label}
              </a>
            ))}
          </div>
          <p>© 2026 Zerone Online Judge. All rights reserved.</p>
        </section>
      </div>
    </footer>
  );
}
