// Fichier : app/components/FormulaireAjoutPnj.js
"use client"; // Formulaire interactif : il a besoin du navigateur

import { useState } from "react";
import { API_URL, lireToken, supprimerToken } from "./session";
import styles from "../page.module.css";

// Message affiché quand le badge est absent, faux ou expiré.
const MESSAGE_SESSION =
  "Votre session a expiré ou est invalide. Veuillez vous reconnecter.";

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

    // 1. On récupère le badge dans le coffre-fort du navigateur
    const token = lireToken();

    // Inutile d'appeler l'API si on sait déjà qu'on n'a pas de badge
    // (ex : le token a été supprimé à la main dans les outils de développement)
    if (!token) {
      onSessionExpiree(MESSAGE_SESSION);
      return; // on s'arrête ici
    }

    try {
      setEnvoi(true);

      // 2. On forge la requête HTTP complète
      const reponse = await fetch(`${API_URL}/api/pnj`, {
        method: "POST", // POST = créer une donnée
        headers: {
          // On prévient l'API qu'on lui envoie du JSON
          "Content-Type": "application/json",
          // Le badge VIP (attention à l'espace après "Bearer")
          Authorization: `Bearer ${token}`,
        },
        // Les données du PNJ, transformées en texte JSON.
        // Number() : le champ niveau donne du texte ("5"), l'API attend un nombre (5).
        body: JSON.stringify({ nom, classe, niveau: Number(niveau) }),
      });

      // 3. Le Vigile de l'API a rejeté le badge :
      // 401 = pas de badge, 403 = badge falsifié ou expiré.
      // On nettoie le navigateur et on renvoie le MJ vers la connexion.
      if (reponse.status === 401 || reponse.status === 403) {
        supprimerToken();
        onSessionExpiree(MESSAGE_SESSION);
        return;
      }

      // Autres erreurs (ex : 400 champ invalide, 500)
      // On essaie de lire le message de l'API ; s'il est illisible, on prend {}.
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(corps.erreur || `Erreur serveur : code ${reponse.status}`);
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
      setErreur(
        err.message === "Failed to fetch"
          ? "Impossible de contacter la Taverne."
          : err.message,
      );
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
