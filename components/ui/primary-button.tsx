'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type PrimaryButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
};

const interaction = {
  whileHover: {
    scale: 1.04,
    backgroundColor: '#8B5CF6',
    boxShadow: '0 0 20px rgba(139, 92, 246, .7), 0 0 40px rgba(139, 92, 246, .3), inset 0 0 20px rgba(139, 92, 246, .15)',
  },
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 18 },
};

export function PrimaryButton({ children, className, href, disabled, type }: PrimaryButtonProps) {
  if (href) {
    return <motion.a className={className} href={href} {...interaction}>{children}</motion.a>;
  }

  return (
    <motion.button
      type={type ?? 'submit'}
      className={className}
      disabled={disabled}
      {...(!disabled ? interaction : {})}
    >
      {children}
    </motion.button>
  );
}
