import * as React from 'react';

import { cn } from '@/lib/utils';

function Tooltip({
  children,
  content,
  side = 'top'
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <div className='relative inline-block'>
      <div className='group'>{children}</div>
      <div
        role='tooltip'
        className={cn(
          'pointer-events-none absolute z-50 invisible rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100',
          side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
          side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
          side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
          side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2'
        )}
      >
        {content}
      </div>
    </div>
  );
}

export { Tooltip };
