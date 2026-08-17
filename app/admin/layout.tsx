import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'ClanForge Admin',
  description: 'Painel administrativo ClanForge',
  robots: 'noindex, nofollow',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
