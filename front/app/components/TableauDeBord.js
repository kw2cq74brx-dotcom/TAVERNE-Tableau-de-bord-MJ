// Fichier : app/components/TableauDeBord.js
"use client"; // Utilise useState et useEffect : il a besoin du navigateur

import { useEffect, useState } from "react";
import FormulaireAjoutPnj from "./FormulaireAjoutPnj";
import { API_URL } from "./session";
import styles from "../page.module.css";

// Fonctionnalité 2 : l'inventaire connecté
// Ce composant n'est construit que si le MJ est authentifié (voir ApplicationTaverne).
// onDeconnexion : appelée par le bouton "Se déconnecter".
// onSessionExpiree : transmise au formulaire d'ajout si le badge est refusé.
export default function TableauDeBord({ onDeconnexion, onSessionExpiree }) {
  // Le triptyque d'états : données, chargement, erreur
  const [pnjs, setPnjs] = useState([]); // la liste des PNJ (vide au départ)
  const [chargement, setChargement] = useState(true); // vrai au démarrage
  const [erreur, setErreur] = useState(null); // aucune erreur au départ

  // Tableau vide [] : l'appel ne se fait qu'une fois, à l'apparition de l'écran.
  // (En développement, le Strict Mode de React l'exécute deux fois : c'est normal.)
  useEffect(() => {
    // Un useEffect ne peut pas être async : on déclare la fonction
    // asynchrone à l'intérieur, puis on l'appelle immédiatement.
    const chargerPNJ = async () => {
      try {
        setErreur(null);

        // On demande la liste des PNJ à l'API (requête GET par défaut).
        const reponse = await fetch(`${API_URL}/api/pnj`);

        // Erreur HTTP (404, 500...) : on la déclenche nous-mêmes vers le catch.
        if (!reponse.ok) {
          throw new Error(`Erreur serveur : code ${reponse.status}`);
        }

        // On transforme la réponse en tableau JavaScript, puis on la mémorise.
        // setPnjs met l'écran à jour automatiquement.
        const donnees = await reponse.json();
        setPnjs(donnees);
      } catch (err) {
        console.error("Problème avec l'API :", err);
        setErreur(
          err.message === "Failed to fetch"
            ? "Impossible de contacter la Taverne."
            : err.message,
        );
      } finally {
        // Succès ou erreur : le chargement est terminé.
        setChargement(false);
      }
    };
    chargerPNJ();
  }, []);

  // Immuabilité : on crée un NOUVEAU tableau (spread) au lieu de faire .push()
  // [...pnjs, nouveauPnj] = "tous les anciens PNJ, puis le nouveau à la fin".
  const ajouterALaListe = (nouveauPnj) => {
    setPnjs([...pnjs, nouveauPnj]);
  };

  return (
    <section className={styles.tableau}>
      <div className={styles.barre}>
        <h2>Inventaire des PNJ</h2>
        {/* onClick : au clic, on appelle la déconnexion du parent */}
        <button className={styles.secondaire} onClick={onDeconnexion}>
          Se déconnecter
        </button>
      </div>

      {/* Opérateur && : chaque message ne s'affiche que si sa condition est vraie */}
      {chargement && <p>Chargement de l&apos;inventaire…</p>}
      {erreur && <p className={styles.erreur}>{erreur}</p>}

      {/* Chargement fini, pas d'erreur, mais liste vide */}
      {!chargement && !erreur && pnjs.length === 0 && (
        <p>La Taverne est vide pour le moment.</p>
      )}

      {/* Le tableau de données est transformé en grille de cartes */}
      {/* map() crée une carte <li> pour chaque PNJ de la liste */}
      <ul className={styles.grille}>
        {pnjs.map((pnj) => (
          // key : identifiant unique obligatoire pour que React suive chaque carte
          <li key={pnj.id} className={styles.pnj}>
            <strong>{pnj.nom}</strong>
            <span>{pnj.classe}</span>
            <span className={styles.niveau}>Niveau {pnj.niveau}</span>
          </li>
        ))}
      </ul>

      {/* Formulaire de création : il nous prévient quand un PNJ est ajouté */}
      <FormulaireAjoutPnj
        onPnjAjoute={ajouterALaListe}
        onSessionExpiree={onSessionExpiree}
      />
    </section>
  );
}
