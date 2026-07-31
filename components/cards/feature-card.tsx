'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  text: string;
  index: number;
};

export function FeatureCard({ icon: Icon, title, text, index }: FeatureCardProps) {
  return (
    <motion.article
      className="feature-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Icon className="feature-icon" />
      <h3>{title}</h3>
      <p>{text}</p>
    </motion.article>
  );
}
