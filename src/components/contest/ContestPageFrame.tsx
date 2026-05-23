import type { ReactNode } from 'react';

type ContestPageFrameProps = {
  children: ReactNode;
};

export default function ContestPageFrame({ children }: ContestPageFrameProps) {
  return <div className="animate-page-enter w-full">{children}</div>;
}
