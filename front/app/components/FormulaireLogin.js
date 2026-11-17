// Fichier : app/components/FormulaireLogin.js
"use client"; // Formulaire interactif : il a besoin du navigateur

import { useState } from "react";
import { API_URL, sauverToken } from "./session";
import styles from "../page.module.css";

// Fonctionnalité 1 : le sas d'authentification
// onLoginSuccess : fonction du parent à appeler quand la connexion réussit.
// message : texte envoyé par le parent (ex : "session expirée").
export default function FormulaireLogin({ onLoginSuccess, message }) {
  // Ce que l'utilisateur tape dans les champs
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  // true pendant que l'on attend la réponse de l'API
  const [chargement, setChargement] = useState(false);
  // Le message d'erreur à afficher (null = aucune erreur)
  const [erreur, setErreur] = useState(null);

  // Fonction lancée quand on clique sur "Se connecter".
  // async : elle va attendre (await) la réponse de l'API.
  const gererConnexion = async (e) => {
    // On empêche le navigateur de recharger la page à l'envoi du formulaire
    e.preventDefault();

    try {
      setChargement(true); // le bouton affiche "Connexion…"
      setErreur(null); // on efface l'ancienne erreur

      // On envoie l'email et le mot de passe à l'API.
      const reponse = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        // On prévient l'API qu'on lui envoie du JSON
        headers: { "Content-Type": "application/json" },
        // HTTP ne transporte que du texte : on sérialise l'objet
        body: JSON.stringify({ email, password: motDePasse }),
      });

      // fetch ne va dans le catch qu'en cas de panne réseau :
      // les erreurs HTTP (401, 500...) doivent être vérifiées à la main.
      // 401 = identifiants refusés par l'API.
      if (reponse.status === 401) {
        throw new Error("Email ou mot de passe incorrect.");
      }
      // 500 = l'API fonctionne mais n'arrive pas à interroger la base Neon.
      if (reponse.status === 500) {
        throw new Error(
          "L'API ne parvient pas à joindre la base de données. Regardez le terminal de l'API.",
        );
      }
      // reponse.ok vaut true si le code est entre 200 et 299.
      if (!reponse.ok) {
        throw new Error(`Erreur serveur : code ${reponse.status}`);
      }

      // On transforme la réponse (texte JSON) en objet JavaScript.
      const donnees = await reponse.json();

      // On range le badge sur le "disque dur" du navigateur pour qu'il
      // survive à un rafraîchissement (un useState serait vidé au F5).
      // On est dans un gestionnaire d'événement : localStorage est accessible.
      sauverToken(donnees.token);

      // On prévient le parent : il bascule vers le tableau de bord
      onLoginSuccess();
    } catch (err) {
      // "throw" plus haut nous envoie ici avec le message d'erreur.
      // TypeError = fetch n'a obtenu aucune réponse : API éteinte ou bloquée par le CORS.
      // (Le texte de cette erreur change selon le navigateur, on teste donc son type.)
      setErreur(
        err instanceof TypeError
          ? `Impossible de contacter l'API (${API_URL}). Vérifiez qu'elle est démarrée et que la page est ouverte sur http://localhost:3001.`
          : err.message,
      );
    } finally {
      // "finally" s'exécute toujours (succès ou erreur) : fin du chargement.
      setChargement(false);
    }
  };

  return (
    // onSubmit : la fonction est appelée à l'envoi du formulaire.
    // La classe "connexion" sert à centrer cet écran (voir page.module.css).
    <form
      className={`${styles.carte} ${styles.connexion}`}
      onSubmit={gererConnexion}
    >
      <h2>Connexion du Maître du Jeu</h2>

      {/* Message venant du parent (ex : session expirée), s'il y en a un */}
      {message && <p className={styles.alerte}>{message}</p>}

      <label>
        Email
        {/* value : ce qui est affiché. onChange : on mémorise chaque touche tapée */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>

      <label>
        Mot de passe
        {/* type="password" : les caractères sont cachés */}
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      {/* Opérateur && : le message n'apparaît que s'il y a une erreur */}
      {erreur && <p className={styles.erreur}>{erreur}</p>}

      {/* Le bouton est désactivé pendant le chargement (évite les doubles clics) */}
      <button type="submit" disabled={chargement}>
        {chargement ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
