// Fichier : app/components/session.js
// Outils partagés pour dialoguer avec l'API.
//
// Sécurité de la session : le badge (JWT) n'est PAS stocké dans le localStorage.
// L'API le range dans un cookie HttpOnly + SameSite :
// - HttpOnly : le JavaScript de la page ne peut pas le lire. Même si un pirate
//   injectait un script (faille XSS), il ne pourrait pas voler le badge.
// - SameSite : le navigateur ne l'envoie pas depuis un autre site (protection CSRF).
// Le navigateur garde ce cookie (il survit au F5) et l'envoie tout seul à l'API,
// à condition que fetch soit appelé avec credentials: "include".

// Adresse de l'API, lue dans .env.local (préfixe NEXT_PUBLIC_ obligatoire
// pour que la variable soit lisible dans le navigateur).
// Si .env.local est absent, on utilise l'adresse locale par défaut :
// sans cela, fetch appellerait "undefined/api/..." et échouerait.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Message affiché quand le badge est absent, faux ou expiré.
export const MESSAGE_SESSION =
  "Votre session a expiré ou est invalide. Veuillez vous reconnecter.";

// Appelle l'API en joignant le cookie du badge.
// chemin : ex. "/api/pnj". options : comme pour fetch (method, body...).
// Si "body" est fourni (un objet), il est transformé en texte JSON.
export function appelerApi(chemin, { body, ...options } = {}) {
  return fetch(`${API_URL}${chemin}`, {
    ...options,
    // "include" : le navigateur envoie le cookie HttpOnly avec la requête
    credentials: "include",
    // On ne déclare du JSON que si on en envoie vraiment
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Lit le message d'erreur renvoyé par l'API ({ erreur: "..." }).
// Si la réponse n'est pas du JSON lisible, on affiche le code HTTP.
export async function lireMessageErreur(reponse) {
  const corps = await reponse.json().catch(() => ({}));
  return corps.erreur || `Erreur serveur : code ${reponse.status}`;
}

// fetch ne lève une erreur (TypeError) que si l'API ne répond pas du tout :
// serveur éteint, réseau coupé ou blocage CORS. Ce message l'explique.
export function messageErreurReseau(err) {
  return err instanceof TypeError
    ? `Impossible de contacter l'API (${API_URL}). Vérifiez qu'elle est démarrée et que la page est ouverte sur http://localhost:3001.`
    : err.message;
}
