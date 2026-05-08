import type { ReactNode } from 'react';
import { SvgIcon } from '@/utils/Icons';

type PreviewSectionProps = {
  title: string;
  children: ReactNode;
};

export default function PreviewSection({
  title,
  children,
}: PreviewSectionProps) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center gap-2">
        <h2 className="text-3xl font-semibold text-slate-950">{title}</h2>
        <SvgIcon name="arrow" size={24} color="#000000" />
      </div>

      <div>{children}</div>
    </section>
  );
}
