import type { ReactNode } from 'react';

type ContestPageFrameProps = {
  children: ReactNode;
};

export default function ContestPageFrame({ children }: ContestPageFrameProps) {
  return <div className="w-full">{children}</div>;
}
