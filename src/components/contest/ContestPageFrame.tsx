import type { ReactNode } from 'react';
import './ContestWorkspace.css';

type ContestPageFrameProps = {
  children: ReactNode;
};

export default function ContestPageFrame({ children }: ContestPageFrameProps) {
  return (
    <div className="zoj-participant animate-page-enter w-full min-w-0">
      {children}
    </div>
  );
}
