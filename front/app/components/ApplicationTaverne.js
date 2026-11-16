// Fichier : app/components/ApplicationTaverne.js
"use client"; // Frontière : à partir d'ici, on a besoin du navigateur

// useState : la "mémoire" du composant. Quand elle change, l'écran se met à jour.
// useEffect : lance du code au bon moment (ici : une fois, à l'affichage).
import { useEffect, useState } from "react";
import FormulaireLogin from "./FormulaireLogin";
import TableauDeBord from "./TableauDeBord";
import { lireToken, supprimerToken, tokenEstEncoreValide } from "./session";

// Le "routeur" de l'application : il choisit l'écran à afficher
// selon que le MJ est connecté ou non (rendu conditionnel).
export default function ApplicationTaverne() {
  // estConnecte : true = le MJ est connecté. setEstConnecte : pour le changer.
  const [estConnecte, setEstConnecte] = useState(false);
  // Vrai tant qu'on n'a pas encore regardé dans le localStorage
  const [verification, setVerification] = useState(true);
  // Message affiché sur l'écran de connexion (ex : session expirée)
  const [message, setMessage] = useState(null);

  // Au montage (tableau vide []) : on regarde si un badge est déjà rangé
  // dans le navigateur. Ainsi la session survit à un rafraîchissement (F5).
  // localStorage n'existe pas côté serveur : il doit être lu dans un useEffect.
  useEffect(() => {
    const verifierSession = async () => {
      const token = lireToken();
      // Un badge existe ET il n'est pas périmé : le MJ reste connecté.
      if (token && tokenEstEncoreValide(token)) {
        setEstConnecte(true);
      } else {
        // Badge absent ou périmé : on nettoie le coffre-fort
        supprimerToken();
      }
      // La vérification est finie : on peut afficher le bon écran.
      setVerification(false);
    };
    verifierSession();
  }, []);

  // Déconnexion volontaire (bouton) ou forcée (badge rejeté par l'API)
  // raison : le message à afficher (null par défaut = pas de message).
  const deconnecter = (raison = null) => {
    supprimerToken();
    setMessage(raison);
    setEstConnecte(false); // React affiche alors le formulaire de connexion
  };

  // Appelée par le formulaire quand la connexion a réussi.
  const connecter = () => {
    setMessage(null);
    setEstConnecte(true); // React affiche alors le tableau de bord
  };

  // Retour anticipé : on n'affiche rien de privé tant que la session n'est pas vérifiée
  if (verification) {
    return <p>Vérification de la session…</p>;
  }

  // Opérateur ternaire : tableau de bord si connecté, sinon formulaire de login.
  // Le tableau de bord n'est jamais construit pour un visiteur non authentifié.
  // On passe des fonctions aux composants enfants ("props") pour qu'ils
  // puissent prévenir ce composant parent (connexion, déconnexion).
  return estConnecte ? (
    <TableauDeBord
      onDeconnexion={() => deconnecter()}
      onSessionExpiree={deconnecter}
    />
  ) : (
    <FormulaireLogin onLoginSuccess={connecter} message={message} />
  );
}
