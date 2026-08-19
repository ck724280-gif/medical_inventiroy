import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'MedCare Pharmacy ERP & POS',
  description: 'Enterprise Medical Inventory, Batch Expiry, FEFO, POS Billing, and Multi-Branch Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" data-theme="dark">
      <body className="h-full bg-obsidian-950 text-[#e2f4ff] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
