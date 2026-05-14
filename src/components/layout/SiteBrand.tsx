import backgroundLogoUrl from '@/assets/logos/background-logo.png';

export default function SiteBrand() {
  return (
    <>
      <img
        alt=""
        aria-hidden="true"
        className="size-9 shrink-0 object-contain"
        src={backgroundLogoUrl}
      />
      <span className="text-lg font-bold text-slate-950">
        <span className="text-zoj-blue">Z</span>erone{' '}
        <span className="text-zoj-blue">O</span>nline{' '}
        <span className="text-zoj-blue">J</span>udge
      </span>
    </>
  );
}
