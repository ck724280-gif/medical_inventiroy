import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
import { MobileNav } from '../components/mobile-nav';
import { AiCopilotDrawer } from '../components/ai-copilot-drawer';

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
    <html lang="en" className="h-full dark" data-theme="dark">
      <body className="h-full bg-surface-page text-text-primary font-sans antialiased transition-colors duration-200">
        <Providers>
          {children}
          <MobileNav />
          <AiCopilotDrawer />
        </Providers>
      </body>
    </html>
  );
}

