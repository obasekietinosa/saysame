import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-card-bg border-[3px] border-border rounded-xl shadow-[8px_8px_0px_0px_var(--color-border)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
