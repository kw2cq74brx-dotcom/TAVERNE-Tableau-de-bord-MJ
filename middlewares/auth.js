// Fichier : middlewares/auth.js
// Le "Vigile" de la Taverne : il vérifie le badge VIP (le JWT) avant
// de laisser passer la requête vers une route protégée.
// Un middleware reçoit 3 paramètres : req (la demande), res (la réponse)
// et next (la fonction qui laisse passer vers la suite).
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Pour récupérer la clé JWT_SECRET

// Nom du cookie qui transporte le badge (utilisé aussi dans server.js).
const NOM_COOKIE = "token_taverne";

// ÉTAPE 1 : Extraire le token
// Le badge peut arriver de deux façons :
// 1. Dans un cookie HttpOnly : c'est ce qu'utilise le Front-end Next.js.
//    Le navigateur l'envoie tout seul, et le JavaScript de la page ne peut
//    pas le lire (protection contre le vol de badge par une faille XSS).
// 2. Dans l'en-tête "Authorization: Bearer <token>" : c'est ce qu'on utilise
//    pour tester l'API avec Postman.
// Renvoie le token trouvé, null s'il n'y en a pas, ou "" si l'en-tête est mal formé.
function extraireToken(req) {
  if (req.cookies?.[NOM_COOKIE]) {
    return req.cookies[NOM_COOKIE];
  }

  const headerAuth = req.headers.authorization;
  if (!headerAuth) {
    return null; // aucun badge présenté
  }

  // "Bearer eyJhbGci..." : on coupe à l'espace et on garde la 2e partie.
  const [type, token] = headerAuth.split(" ");
  // Le mot "Bearer" et le badge sont tous les deux obligatoires.
  return type === "Bearer" && token ? token : "";
}

const verifierToken = (req, res, next) => {
  const token = extraireToken(req);

  // Pas de badge du tout : 401 = on ne sait pas qui vous êtes.
  // "return" arrête la fonction : la route n'est jamais atteinte.
  if (token === null) {
    return res
      .status(401)
      .json({ erreur: "Accès refusé. Aucun badge VIP présenté." });
  }
  if (token === "") {
    return res.status(401).json({ erreur: "Format de token invalide." });
  }

  // ÉTAPE 2 et 3 : Vérifier la signature et décider du passage
  try {
    // jwt.verify recalcule la signature avec notre clé secrète.
    // Si le token est trafiqué ou expiré, on passe dans le catch.
    // On impose HS256 pour refuser tout autre algorithme (ex: "none").
    const payloadDecode = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // On accroche l'utilisateur à la requête : la route saura "qui" agit.
    // Exemple : req.utilisateur.id donne l'id du Maître du Jeu.
    req.utilisateur = payloadDecode;

    // Le Vigile ouvre la porte : la requête continue vers la route.
    // Sans next(), la requête resterait bloquée (chargement infini).
    next();
  } catch (erreur) {
    // Badge faux ou expiré : 403 = accès interdit.
    return res
      .status(403)
      .json({ erreur: "Badge VIP invalide ou expiré. Expulsion immédiate." });
  }
};

// Autorisation (AuthZ) : après l'authentification, on vérifie le RÔLE.
// exigerRole("Maitre_Du_Jeu") fabrique un middleware qui ne laisse passer
// que les utilisateurs ayant l'un des rôles donnés. Il se place APRÈS
// verifierToken, qui a rempli req.utilisateur.
// Aujourd'hui seul le rôle "Maitre_Du_Jeu" existe, mais si l'on ajoute
// un rôle "Joueur", il pourra lire les PNJ sans pouvoir les modifier.
const exigerRole =
  (...rolesAutorises) =>
  (req, res, next) => {
    const role = req.utilisateur?.role;

    // 403 = vous êtes reconnu, mais vous n'avez pas les droits suffisants.
    if (!rolesAutorises.includes(role)) {
      return res.status(403).json({
        erreur: "Droits insuffisants pour effectuer cette action.",
      });
    }
    next();
  };

// On partage le Vigile et le contrôle de rôle avec server.js.
module.exports = { verifierToken, exigerRole, NOM_COOKIE };
