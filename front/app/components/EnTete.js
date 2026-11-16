// Fichier : app/components/EnTete.js
// Server Component : simple affichage, aucun besoin du navigateur
// (pas de clic, pas de useState), donc pas de "use client".
import styles from "../page.module.css";

// { titre } : on récupère la propriété "titre" envoyée par page.js.
export default function EnTete({ titre }) {
  return (
    <header className={styles.entete}>
      <h1>La Taverne</h1>
      {/* Les accolades { } permettent d'afficher une variable dans le HTML */}
      <p>{titre}</p>
    </header>
  );
}
