import type {Metadata} from 'next';
import { ToastContainer } from '@/components/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'DataGouv Explorer - Visualisez les données publiques françaises',
  description: 'Explorez et visualisez les jeux de données de data.gouv.fr grâce à l\'intelligence artificielle. Posez vos questions en langage naturel.',
  keywords: ['data.gouv.fr', 'open data', 'données publiques', 'France', 'visualisation', 'IA'],
  robots: 'index, follow',
  openGraph: {
    title: 'DataGouv Explorer',
    description: 'Explorez et visualisez les données publiques françaises avec l\'IA',
    type: 'website',
    locale: 'fr_FR',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
