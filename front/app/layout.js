// Fichier : app/layout.js
// Le "cadre" commun à toutes les pages du site : balises <html> et <body>,
// polices de caractères et styles globaux.
// Chaque page (comme page.js) s'affiche à l'endroit de {children}.

// On importe les polices Geist depuis Google Fonts (gérées par Next.js).
import { Geist, Geist_Mono } from "next/font/google";
// Styles appliqués à tout le site.
import "./globals.css";

// Police principale, utilisable en CSS avec var(--font-geist-sans).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Police "machine à écrire" (pour le code), avec var(--font-geist-mono).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Informations de la page : le titre s'affiche dans l'onglet du navigateur.
export const metadata = {
  title: "La Taverne",
  description: "Tableau de bord du Maître du Jeu",
};

// children : le contenu de la page affichée (ici, page.js).
export default function RootLayout({ children }) {
  return (
    // lang="fr" : on indique au navigateur que le site est en français.
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
