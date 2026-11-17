// Fichier : app/components/FormulaireAjoutPnj.js
"use client"; // Formulaire interactif : il a besoin du navigateur

import { useState } from "react";
import {
  MESSAGE_SESSION,
  appelerApi,
  lireMessageErreur,
  messageErreurReseau,
} from "./session";
import styles from "../page.module.css";

// Fonctionnalité 3 : l'enrôlement sous haute sécurité
// onPnjAjoute : prévient le tableau de bord qu'un PNJ a été créé.
// onSessionExpiree : renvoie le MJ vers l'écran de connexion.
export default function FormulaireAjoutPnj({ onPnjAjoute, onSessionExpiree }) {
  // Les champs du formulaire
  const [nom, setNom] = useState("");
  const [classe, setClasse] = useState("");
  const [niveau, setNiveau] = useState(1);
  // true pendant l'envoi à l'API
  const [envoi, setEnvoi] = useState(false);
  // Messages à afficher (null = rien à afficher)
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  // Fonction lancée quand on clique sur "Ajouter le PNJ".
  const ajouterPNJ = async (e) => {
    e.preventDefault(); // pas de rechargement de la page
    setErreur(null);
    setSucces(null);

    try {
      setEnvoi(true);

      // On forge la requête HTTP complète : méthode POST et corps JSON.
      // Le badge voyage dans le cookie HttpOnly, joint automatiquement
      // par le navigateur (credentials: "include" dans appelerApi).
      const reponse = await appelerApi("/api/pnj", {
        method: "POST",
        // Number() : le champ niveau donne du texte ("5"), l'API attend un nombre (5).
        body: { nom, classe, niveau: Number(niveau) },
      });

      // Le Vigile de l'API a rejeté le badge :
      // 401 = pas de badge (cookie supprimé), 403 = badge falsifié ou expiré.
      // On renvoie le MJ vers la connexion avec un message clair.
      if (reponse.status === 401 || reponse.status === 403) {
        onSessionExpiree(MESSAGE_SESSION);
        return;
      }

      // Autres erreurs (ex : 400 champ invalide, 500) : message de l'API
      if (!reponse.ok) {
        throw new Error(await lireMessageErreur(reponse));
      }

      // Succès : l'API renvoie { message, pnj }.
      const donnees = await reponse.json();
      onPnjAjoute(donnees.pnj); // la carte apparaît dans la grille
      setSucces(donnees.message); // ex : "Aragorn le Rôdeur a rejoint la taverne !"

      // On vide le formulaire
      setNom("");
      setClasse("");
      setNiveau(1);
    } catch (err) {
      console.error("Échec de l'ajout :", err.message);
      setErreur(messageErreurReseau(err));
    } finally {
      setEnvoi(false); // fin de l'envoi, succès ou erreur
    }
  };

  return (
    <form className={styles.carte} onSubmit={ajouterPNJ}>
      <h2>Enrôler un nouveau PNJ</h2>

      <label>
        Nom
        {/* required : le navigateur refuse l'envoi si le champ est vide */}
        <input value={nom} onChange={(e) => setNom(e.target.value)} required />
      </label>

      <label>
        Classe
        <input
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          required
        />
      </label>

      <label>
        Niveau
        {/* type="number" min="1" : uniquement des nombres, au moins 1 */}
        <input
          type="number"
          min="1"
          step="1"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          required
        />
      </label>

      {/* Message rouge en cas d'erreur, vert en cas de succès */}
      {erreur && <p className={styles.erreur}>{erreur}</p>}
      {succes && <p className={styles.succes}>{succes}</p>}

      <button type="submit" disabled={envoi}>
        {envoi ? "Envoi…" : "Ajouter le PNJ"}
      </button>
    </form>
  );
}
