// Fichier : app/components/TableauDeBord.js
"use client"; // Utilise useState et useEffect : il a besoin du navigateur

import { useEffect, useState } from "react";
import FormulaireAjoutPnj from "./FormulaireAjoutPnj";
import {
  MESSAGE_SESSION,
  appelerApi,
  lireMessageErreur,
  messageErreurReseau,
} from "./session";
import styles from "../page.module.css";

// Fonctionnalité 2 : l'inventaire connecté (+ modification et suppression)
// Ce composant n'est construit que si le MJ est authentifié (voir ApplicationTaverne).
// onDeconnexion : appelée par le bouton "Se déconnecter".
// onSessionExpiree : appelée si l'API refuse le badge (401/403).
export default function TableauDeBord({ onDeconnexion, onSessionExpiree }) {
  // Le triptyque d'états : données, chargement, erreur
  const [pnjs, setPnjs] = useState([]); // la liste des PNJ (vide au départ)
  const [chargement, setChargement] = useState(true); // vrai au démarrage
  const [erreur, setErreur] = useState(null); // aucune erreur au départ
  // id du PNJ en cours de modification/suppression (null = aucun) :
  // sert à désactiver ses boutons pendant que l'API répond.
  const [pnjEnCours, setPnjEnCours] = useState(null);

  // Tableau vide [] : l'appel ne se fait qu'une fois, à l'apparition de l'écran.
  // (En développement, le Strict Mode de React l'exécute deux fois : c'est normal.)
  useEffect(() => {
    // Un useEffect ne peut pas être async : on déclare la fonction
    // asynchrone à l'intérieur, puis on l'appelle immédiatement.
    const chargerPNJ = async () => {
      try {
        setErreur(null);

        // On demande la liste des PNJ à l'API (requête GET par défaut).
        const reponse = await appelerApi("/api/pnj");

        // Erreur HTTP (404, 500...) : on la déclenche nous-mêmes vers le catch.
        if (!reponse.ok) {
          throw new Error(await lireMessageErreur(reponse));
        }

        // On transforme la réponse en tableau JavaScript, puis on la mémorise.
        // setPnjs met l'écran à jour automatiquement.
        const donnees = await reponse.json();
        setPnjs(donnees);
      } catch (err) {
        console.error("Problème avec l'API :", err);
        setErreur(messageErreurReseau(err));
      } finally {
        // Succès ou erreur : le chargement est terminé.
        setChargement(false);
      }
    };
    chargerPNJ();
  }, []);

  // Envoie une requête protégée (PATCH ou DELETE) pour un PNJ donné.
  // Renvoie les données de l'API, ou null si l'action a échoué.
  const actionProtegee = async (id, options) => {
    setErreur(null);
    setPnjEnCours(id);
    try {
      const reponse = await appelerApi(`/api/pnj/${id}`, options);

      // Badge absent, falsifié ou expiré : retour à l'écran de connexion
      if (reponse.status === 401 || reponse.status === 403) {
        onSessionExpiree(MESSAGE_SESSION);
        return null;
      }
      // Autres erreurs (400 niveau invalide, 404 PNJ déjà supprimé, 500...)
      if (!reponse.ok) {
        throw new Error(await lireMessageErreur(reponse));
      }
      return await reponse.json();
    } catch (err) {
      setErreur(messageErreurReseau(err));
      return null;
    } finally {
      setPnjEnCours(null);
    }
  };

  // PATCH /api/pnj/:id : changer le niveau d'un PNJ (+1 ou -1)
  const changerNiveau = async (pnj, ecart) => {
    const donnees = await actionProtegee(pnj.id, {
      method: "PATCH",
      body: { niveau: pnj.niveau + ecart },
    });
    if (donnees) {
      // Immuabilité : map() crée un NOUVEAU tableau où seul ce PNJ est remplacé
      // par la version renvoyée par l'API.
      setPnjs((liste) =>
        liste.map((p) => (p.id === pnj.id ? donnees.pnj : p)),
      );
    }
  };

  // DELETE /api/pnj/:id : supprimer un PNJ (après confirmation)
  const supprimerPNJ = async (pnj) => {
    if (!window.confirm(`Supprimer définitivement ${pnj.nom} ?`)) {
      return; // le MJ a cliqué sur "Annuler"
    }
    const donnees = await actionProtegee(pnj.id, { method: "DELETE" });
    if (donnees) {
      // Immuabilité : filter() crée un NOUVEAU tableau sans ce PNJ.
      setPnjs((liste) => liste.filter((p) => p.id !== pnj.id));
    }
  };

  // Immuabilité : on crée un NOUVEAU tableau (spread) au lieu de faire .push()
  // [...liste, nouveauPnj] = "tous les anciens PNJ, puis le nouveau à la fin".
  const ajouterALaListe = (nouveauPnj) => {
    setPnjs((liste) => [...liste, nouveauPnj]);
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
        {pnjs.map((pnj) => {
          // Pendant une action sur ce PNJ, ses boutons sont désactivés
          const occupe = pnjEnCours === pnj.id;
          return (
            // key : identifiant unique obligatoire pour que React suive chaque carte
            <li key={pnj.id} className={styles.pnj}>
              <strong>{pnj.nom}</strong>
              <span>{pnj.classe}</span>

              {/* Modification du niveau (PATCH) */}
              <div className={styles.niveauControles}>
                <button
                  type="button"
                  className={styles.petit}
                  onClick={() => changerNiveau(pnj, -1)}
                  // Le niveau ne peut pas descendre sous 1 (règle de l'API)
                  disabled={occupe || pnj.niveau <= 1}
                  aria-label={`Baisser le niveau de ${pnj.nom}`}
                >
                  −
                </button>
                <span className={styles.niveau}>Niveau {pnj.niveau}</span>
                <button
                  type="button"
                  className={styles.petit}
                  onClick={() => changerNiveau(pnj, 1)}
                  disabled={occupe}
                  aria-label={`Augmenter le niveau de ${pnj.nom}`}
                >
                  +
                </button>
              </div>

              {/* Suppression (DELETE) */}
              <button
                type="button"
                className={styles.danger}
                onClick={() => supprimerPNJ(pnj)}
                disabled={occupe}
              >
                Supprimer
              </button>
            </li>
          );
        })}
      </ul>

      {/* Formulaire de création : il nous prévient quand un PNJ est ajouté */}
      <FormulaireAjoutPnj
        onPnjAjoute={ajouterALaListe}
        onSessionExpiree={onSessionExpiree}
      />
    </section>
  );
}
