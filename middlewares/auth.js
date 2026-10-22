// Fichier : middlewares/auth.js
// Le "Vigile" de la Taverne : il vérifie le badge VIP (le JWT) avant
// de laisser passer la requête vers une route protégée.
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Pour récupérer la clé JWT_SECRET

const verifierToken = (req, res, next) => {
  // ÉTAPE 1 : Extraire le token
  // Le client doit l'envoyer dans l'en-tête : Authorization: Bearer <token>
  const headerAuth = req.headers.authorization;

  // Pas d'en-tête du tout : 401 = on ne sait pas qui vous êtes.
  if (!headerAuth) {
    return res
      .status(401)
      .json({ erreur: "Accès refusé. Aucun badge VIP présenté." });
  }

  // "Bearer eyJhbGci..." : on coupe à l'espace et on garde la 2e partie.
  const [type, token] = headerAuth.split(" ");
  if (type !== "Bearer" || !token) {
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
    req.utilisateur = payloadDecode;

    // Le Vigile ouvre la porte.
    next();
  } catch (erreur) {
    return res
      .status(403)
      .json({ erreur: "Badge VIP invalide ou expiré. Expulsion immédiate." });
  }
};

module.exports = verifierToken;
