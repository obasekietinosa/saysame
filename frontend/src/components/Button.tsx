import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'muted';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', fullWidth = false, className = '', children, ...props }: ButtonProps) {
  let variantClasses = '';

  if (variant === 'primary') {
    variantClasses = 'bg-primary text-white';
  } else if (variant === 'secondary') {
    variantClasses = 'bg-secondary text-foreground';
  } else if (variant === 'muted') {
    variantClasses = 'bg-muted text-foreground';
  }

  const baseClasses = `
    font-black uppercase tracking-wide
    py-3 px-6 rounded-xl
    border-[3px] border-border
    shadow-[4px_4px_0px_0px_var(--color-border)]
    transition-all duration-150 ease-in-out
    hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--color-border)]
    active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_var(--color-border)]
  `;

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
