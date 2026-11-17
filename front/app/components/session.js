// Fichier : app/components/session.js
// Outils partagés pour la session du MJ.
// Ces fonctions utilisent localStorage : on ne les appelle que dans
// un useEffect ou un gestionnaire d'événement (jamais côté serveur,
// car le serveur n'a pas de navigateur, donc pas de localStorage).

// Adresse de l'API, lue dans .env.local (préfixe NEXT_PUBLIC_ obligatoire
// pour que la variable soit lisible dans le navigateur).
// Si .env.local est absent, on utilise l'adresse locale par défaut :
// sans cela, fetch appellerait "undefined/api/..." et échouerait.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Clé sous laquelle le JWT est rangé dans le "coffre-fort" du navigateur
const CLE_TOKEN = "token_taverne";

// Lire le badge (renvoie null s'il n'y en a pas).
export function lireToken() {
  return localStorage.getItem(CLE_TOKEN);
}

// Ranger le badge (il reste même après un F5 ou une fermeture d'onglet).
export function sauverToken(token) {
  localStorage.setItem(CLE_TOKEN, token);
}

// Jeter le badge (déconnexion).
export function supprimerToken() {
  localStorage.removeItem(CLE_TOKEN);
}

// Le payload d'un JWT n'est pas chiffré, seulement encodé en Base64 :
// on peut donc lire sa date d'expiration ("exp") côté navigateur.
// Cela évite d'afficher le tableau de bord avec un badge déjà périmé.
// (La vraie vérification de la signature reste faite par l'API.)
export function tokenEstEncoreValide(token) {
  try {
    // Un JWT a 3 parties séparées par des points : header.payload.signature
    // split(".")[1] garde la 2e partie : le payload.
    // Le JWT utilise le Base64 "URL" (- et _) : on le convertit pour atob
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    // atob décode le Base64, JSON.parse transforme le texte en objet.
    const payload = JSON.parse(atob(base64));
    // exp est en secondes, Date.now() en millisecondes : on multiplie par 1000.
    // true si la date d'expiration n'est pas encore passée.
    return payload.exp * 1000 > Date.now();
  } catch {
    // Badge illisible (abîmé ou trafiqué) : on le considère comme invalide.
    return false;
  }
}
