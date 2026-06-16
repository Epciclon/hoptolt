import type { Metadata } from 'next';
import './globals.css';

import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: 'Hoptolt',
  description: 'Hoptolt: gestión integral de criaderos de conejos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
