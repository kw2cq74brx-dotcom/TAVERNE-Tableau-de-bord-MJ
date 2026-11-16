// Fichier : app/page.js
// La page d'accueil du site (adresse : http://localhost:3001/).
// C'est un Server Component (pas de "use client") : son code s'exécute
// sur le serveur, qui envoie au navigateur du HTML déjà prêt.
// Seule la partie interactive (ApplicationTaverne) devient un Client Component.

// On importe les morceaux qui composent la page.
import EnTete from "./components/EnTete";
import ApplicationTaverne from "./components/ApplicationTaverne";
// On importe les styles (fichier CSS "module" : les classes sont propres à ce fichier).
import styles from "./page.module.css";

// "export default" : c'est ce composant que Next.js affiche pour cette page.
export default function Home() {
  return (
    <main className={styles.main}>
      {/* L'en-tête reçoit son texte grâce à la propriété "titre" */}
      <EnTete titre="Tableau de bord du MJ" />
      {/* La partie interactive : connexion puis tableau de bord */}
      <ApplicationTaverne />
    </main>
  );
}
