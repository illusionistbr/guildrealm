'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  icon: LucideIcon;
  value: string;
  label: string;
  index: number;
};

export function StatCard({ icon: Icon, value, label, index }: StatCardProps) {
  return (
    <motion.div
      className="stat"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.45, delay: (index + 1) * 0.1, ease: 'easeOut' }}
    >
      <Icon />
      <div><strong>{value}</strong><span>{label}</span></div>
    </motion.div>
  );
}
