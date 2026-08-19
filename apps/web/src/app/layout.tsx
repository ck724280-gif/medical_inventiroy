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
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-100 text-slate-900 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
