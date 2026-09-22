import backgroundLogoUrl from '@/assets/logos/background-logo.png';
import { SvgIcon } from '@/utils/Icons';

const footerPolicies = [
  { label: 'ZOJ 소개', href: '/about' },
  { label: '이용안내', href: '/support' },
  { label: '개인정보처리방침', href: '/support?tab=privacy' },
  { label: '서비스 문의', href: '/support?tab=contact' },
] as const;

const footerPeople = [
  {
    role: 'infra & DevOps & Backend',
    name: '손동열',
    email: 'sdy423@hanyang.ac.kr',
  },
  {
    role: 'Frontend',
    name: '조성민',
    email: 'sjo480524@hanyang.ac.kr',
  },
  {
    role: 'Design',
    name: '여지훈',
    email: 'zasc90@hanyang.ac.kr',
  },
  {
    role: 'Design',
    name: '조영은',
    email: 'fgfg1025@hanyang.ac.kr',
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#f3f6fb]">
      <div className="mx-auto grid w-full max-w-[96rem] gap-12 px-[clamp(1.5rem,5vw,4rem)] py-[clamp(3rem,7vw,6.5rem)]">
        <section className="grid gap-10 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.05fr)_minmax(24rem,1.2fr)_minmax(11rem,0.55fr)_minmax(10rem,0.5fr)] xl:items-start xl:gap-0">
          <div className="grid content-start justify-items-start gap-5 xl:min-h-full xl:place-content-center xl:pr-[clamp(2rem,3vw,4rem)]">
            <div className="flex min-w-0 items-center gap-3">
              <img
                alt=""
                aria-hidden="true"
                className="size-[clamp(3.25rem,5vw,4.25rem)] shrink-0 object-contain"
                src={backgroundLogoUrl}
              />
              <div className="min-w-0">
                <p className="zoj-truncate-safe text-[clamp(1rem,1.55vw,1.55rem)] leading-tight font-black tracking-normal whitespace-nowrap text-slate-950">
                  Zerone Online Judge
                </p>
                <p className="mt-1 text-[clamp(0.8rem,1vw,1rem)] leading-snug font-bold text-slate-500">
                  Programming Contest Platform
                </p>
              </div>
            </div>
            <div className="pl-[clamp(4.5rem,6vw,5.5rem)]">
              <a
                aria-label="GitHub 열기"
                className="hover:text-zoj-blue inline-flex size-11 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_0.4rem_1rem_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_0.7rem_1.25rem_rgba(15,23,42,0.16)]"
                href="https://github.com/ZERONE-Online-Judge"
                rel="noreferrer"
                target="_blank"
              >
                <SvgIcon name="github" size="1.55rem" />
              </a>
            </div>
          </div>

          <section className="grid gap-7 border-slate-200 xl:border-l xl:px-[clamp(2rem,3vw,4rem)]">
            <h2 className="text-[clamp(1rem,1.15vw,1.15rem)] font-black text-slate-950">
              Team
            </h2>
            <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {footerPeople.map((person) => (
                <div className="grid min-w-0 gap-2" key={person.email}>
                  <span className="text-xs leading-none font-black text-slate-400">
                    {person.role}
                  </span>
                  <span className="text-sm font-black text-slate-950">
                    {person.name}
                  </span>
                  <a
                    className="zoj-break-anywhere hover:text-zoj-blue text-xs font-bold text-slate-500 underline-offset-4 transition hover:underline"
                    href={`mailto:${person.email}`}
                  >
                    {person.email}
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="grid content-start gap-7 border-slate-200 xl:border-l xl:px-[clamp(2rem,3vw,3.25rem)]">
            <h2 className="text-[clamp(1rem,1.15vw,1.15rem)] font-black text-slate-950">
              Service
            </h2>
            <nav aria-label="서비스 링크" className="grid gap-6">
              {footerPolicies.map((policy, index) => (
                <a
                  className={[
                    'hover:text-zoj-blue inline-flex items-center justify-between gap-4 text-sm font-black text-slate-500 transition',
                    index === 0 ? 'text-[#7b61ff]' : '',
                  ].join(' ')}
                  href={policy.href}
                  key={policy.label}
                >
                  <span>{policy.label}</span>
                  <span
                    aria-hidden="true"
                    className="text-2xl leading-none text-current"
                  >
                    ›
                  </span>
                </a>
              ))}
            </nav>
          </section>

          <section className="grid content-start gap-7 border-slate-200 xl:border-l xl:pl-[clamp(2rem,3vw,3.25rem)]">
            <h2 className="text-[clamp(1rem,1.15vw,1.15rem)] font-black text-slate-950">
              Links
            </h2>
            <a
              className="hover:text-zoj-blue text-sm font-black text-slate-500 underline-offset-4 transition hover:underline"
              href="https://github.com/ZERONE-Online-Judge"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </section>
        </section>

        <section className="flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs font-black text-slate-300 md:flex-row md:items-center md:justify-end">
          <p>@ 2026 Zerone Online Judge. All rights reserved.</p>
        </section>
      </div>
    </footer>
  );
}
