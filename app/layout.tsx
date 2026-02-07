import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Nav } from '@/components/nav';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Portfolio Watchman',
  description: 'Biotech investor containment dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
