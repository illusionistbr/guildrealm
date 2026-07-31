import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'GuildRealm Admin',
  description: 'Painel administrativo GuildRealm',
  robots: 'noindex, nofollow',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
