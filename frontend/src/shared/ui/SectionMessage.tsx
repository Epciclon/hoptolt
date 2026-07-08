'use client';

import { ReactNode } from 'react';

interface SectionMessageProps {
  message: string | ReactNode;
}

export function SectionMessage({ message }: Readonly<SectionMessageProps>) {
  return (
    <div className="flex flex-col gap-1 items-start mb-6">
      <p className="text-base font-medium text-slate-700">
        {message}
      </p>
    </div>
  );
}
