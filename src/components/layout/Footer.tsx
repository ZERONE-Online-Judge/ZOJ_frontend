import backgroundLogoUrl from '@/assets/logos/background-logo.png';
import { SvgIcon } from '@/utils/Icons';

const footerLinkGroups = [
  {
    title: '서비스',
    links: [
      { label: '대회 목록', href: '/contests' },
      { label: '공지사항', href: '/notices' },
      { label: '지원 안내', href: '/support' },
    ],
  },
  {
    title: '운영',
    links: [
      { label: '운영자', href: '/operator' },
      { label: '관리자', href: '/admin' },
    ],
  },
  {
    title: '채점',
    links: [
      { label: '채점 상태', href: '/judge-status' },
      { label: '문제집', href: '/contests' },
    ],
  },
  {
    title: '개발',
    links: [
      { label: 'GitHub', href: 'https://github.com/ZERONE-Online-Judge' },
      { label: '문의 메일', href: 'mailto:zoj.service@gmail.com' },
    ],
  },
] as const;

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

function isExternalLink(href: string) {
  return href.startsWith('http') || href.startsWith('mailto:');
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-0">
        <nav
          aria-label="푸터 링크"
          className="grid border-x border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4"
        >
          {footerLinkGroups.map((group) => (
            <details
              className="group border-b border-slate-200 open:bg-slate-50 lg:border-b-0 lg:border-r lg:last:border-r-0"
              key={group.title}
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-6 text-base font-black text-slate-950 marker:hidden">
                {group.title}
                <span className="text-2xl leading-none font-light text-slate-500 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="grid gap-2 px-6 pb-5">
                {group.links.map((link) => (
                  <a
                    className="text-sm font-bold text-slate-500 transition hover:text-zoj-blue"
                    href={link.href}
                    key={link.label}
                    rel={isExternalLink(link.href) ? 'noreferrer' : undefined}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </details>
          ))}
        </nav>

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
                  href="mailto:support@zerone01.kr"
                >
                  support@zerone01.kr
                </a>
              </p>
              <p>운영 이슈는 대회 게시판의 비공개 질문으로 접수해 주세요.</p>
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
                href="mailto:support@zerone01.kr"
              >
                서비스 문의
                <span className="text-xl text-slate-400">›</span>
              </a>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                aria-label="GitHub 열기"
                className="inline-flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:text-zoj-blue"
                href="https://github.com/zerone-01"
                rel="noreferrer"
                target="_blank"
              >
                <SvgIcon name="github" size={24} />
              </a>
              <a
                aria-label="문의 메일 보내기"
                className="inline-flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:text-zoj-blue"
                href="mailto:support@zerone01.kr"
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
