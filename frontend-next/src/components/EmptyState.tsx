'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 w-16 h-16 rounded-full flex items-center justify-center bg-shelf-50 dark:bg-shelf-950/40 text-shelf-500 dark:text-shelf-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-serif font-semibold text-stone-700 dark:text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-stone-500 dark:text-gray-500 max-w-md mb-6">{description}</p>}
      {action}
    </div>
  );
}
