import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ fullWidth = true, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          px-4 py-3 bg-white text-foreground text-lg
          border-[3px] border-border rounded-xl
          focus:outline-none focus:shadow-[4px_4px_0px_0px_var(--color-border)]
          transition-shadow duration-150 ease-in-out
          disabled:bg-muted disabled:cursor-not-allowed
          ${fullWidth ? 'w-full' : ''} ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
