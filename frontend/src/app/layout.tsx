import type { Metadata } from 'next';
import './globals.css';

import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: 'Hoptolt',
  description: 'Hoptolt: gestión integral de criaderos de conejos',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var size = localStorage.getItem('fontSize');
                var family = localStorage.getItem('fontFamily');
                var bold = localStorage.getItem('fontBold');
                var theme = localStorage.getItem('theme');
                
                if (size) document.documentElement.style.fontSize = size;
                if (theme === 'dark') document.documentElement.classList.add('theme-dark', 'dark');
                else if (theme === 'contrast') document.documentElement.classList.add('theme-contrast', 'dark');
                
                if (family) document.body.style.fontFamily = family;
                if (bold === 'true') document.documentElement.classList.add('theme-bold');
              } catch (e) {}
            `,
          }}
        />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
