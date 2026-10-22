
// On charge le fichier .env.
require("dotenv").config();

// On importe Express.
const express = require("express");

// On importe les outils de sécurité.
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// On importe la connexion à la base de données (fichier db.js).
const pool = require("./db");

// On importe notre Vigile (middleware qui vérifie le JWT).
const verifierToken = require("./middlewares/auth");

// Sans clé secrète, impossible de signer les badges : on refuse de démarrer.
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET manquant dans le fichier .env. Arrêt du serveur.");
  process.exit(1);
}

// On crée l'application.
const app = express();

// On prend le port écrit dans le .env.
// S'il n'y en a pas, on utilise 3000.
const PORT = process.env.PORT || 3000;

// CORS : liste blanche. Seul le Front-end local a le droit de nous
// appeler depuis un navigateur. Toute autre origine est rejetée.
// (Jamais cors() sans option : cela autoriserait tout le monde "*".)
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  optionsSuccessStatus: 200,
};

// Le CORS se place TOUT EN HAUT, avant même express.json().
app.use(cors(corsOptions));

// Ce middleware permet de lire le JSON envoyé par le client.
// Sans lui, req.body est vide (undefined).
// Il doit être placé avant les routes.
app.use(express.json());
function estUnIdValide(valeur) {
  return /^\d+$/.test(valeur) && Number(valeur) > 0;
}

// Empreinte "leurre" : si l'email n'existe pas, on compare quand même
// avec elle. Ainsi la réponse prend le même temps dans tous les cas,
// et un pirate ne peut pas deviner quels emails existent.
const HASH_LEURRE = bcrypt.hashSync("leurre-taverne", 10);


// POST /api/auth/login : échanger ses identifiants contre un JWT
// Route publique : c'est le guichet où l'on obtient son badge VIP.
app.post("/api/auth/login", async (req, res) => {
  // Erreur "muette" : même message que l'email ou le mot de passe soit faux.
  const erreurIdentifiants = { erreur: "Identifiants incorrects" };

  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res
        .status(400)
        .json({ erreur: "Les champs 'email' et 'password' sont obligatoires" });
    }

    const resultat = await pool.query(
      "SELECT id, email, mot_de_passe, role FROM Utilisateur WHERE email = $1",
      [email.trim().toLowerCase()],
    );
    const utilisateur = resultat.rows[0];

    // Bcrypt relit le sel caché dans l'empreinte et compare.
    const motDePasseValide = await bcrypt.compare(
      password,
      utilisateur ? utilisateur.mot_de_passe : HASH_LEURRE,
    );

    // Code 401 = authentification échouée.
    if (!utilisateur || !motDePasseValide) {
      return res.status(401).json(erreurIdentifiants);
    }

    // On fabrique le badge. Le payload est lisible par tous (Base64) :
    // on n'y met que des infos non sensibles, jamais le mot de passe.
    const token = jwt.sign(
      { id: utilisateur.id, email: utilisateur.email, role: utilisateur.role },
      process.env.JWT_SECRET,
      { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
    );

    res.status(200).json({ message: "Bienvenue Maître du Jeu !", token });
  } catch (erreur) {
    console.error("Erreur POST /api/auth/login :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});


// GET /api/pnj : afficher tous les PNJ
// GET sert à lire des données. Il ne modifie rien.
// Route publique : pas de Vigile, tout le monde peut lire l'inventaire.
// "async" veut dire que la fonction va attendre la base de données.
app.get("/api/pnj", async (req, res) => {
  // "try" : on essaie d'exécuter le code.
  // En cas de problème, on passe dans "catch" et le serveur ne plante pas.
  try {
    // "await" attend la réponse de la base avant de continuer.
    const resultat = await pool.query("SELECT * FROM Personnage ORDER BY id");
    res.status(200).json(resultat.rows);
  } catch (erreur) {
    console.error("Erreur GET /api/pnj :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});


// GET /api/pnj/:id : afficher un seul PNJ
// ":id" est une variable dans l'URL. Exemple : /api/pnj/2
app.get("/api/pnj/:id", async (req, res) => {
  try {
    // On récupère l'id écrit dans l'URL.
    const idSaisi = req.params.id;

    // Si l'id n'est pas valide, on arrête ici.
    // Code 400 = le client a envoyé une mauvaise demande.
    if (!estUnIdValide(idSaisi)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }

    const resultat = await pool.query(
      "SELECT * FROM Personnage WHERE id = $1",
      [idSaisi],
    );

    if (resultat.rows.length === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    // On renvoie le PNJ trouvé (la première ligne).
    res.status(200).json(resultat.rows[0]);
  } catch (erreur) {
    console.error("Erreur GET /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});


// POST /api/pnj : créer un nouveau PNJ
// Route protégée : le Vigile (verifierToken) contrôle le badge d'abord.
app.post("/api/pnj", verifierToken, async (req, res) => {
  try {
    // On récupère nom, classe et niveau envoyés par le client.
    const { nom, classe, niveau } = req.body;
    if (typeof nom !== "string" || nom.trim() === "") {
      return res.status(400).json({ erreur: "Le champ 'nom' est obligatoire" });
    }
    // La classe doit être un texte, et pas vide.
    if (typeof classe !== "string" || classe.trim() === "") {
      return res
        .status(400)
        .json({ erreur: "Le champ 'classe' est obligatoire" });
    }
    // Le niveau doit être un nombre entier, au minimum 1.
    if (!Number.isInteger(niveau) || niveau < 1) {
      return res.status(400).json({
        erreur: "Le champ 'niveau' est obligatoire et doit être un entier ≥ 1",
      });
    }

    // On ajoute le PNJ dans la base.
    const resultat = await pool.query(
      "INSERT INTO Personnage (nom, classe, niveau) VALUES ($1, $2, $3) RETURNING *",
      [nom.trim(), classe.trim(), niveau],
    );
    const nouveauPnj = resultat.rows[0];

    // Grâce au Vigile, on sait qui a créé le PNJ.
    console.log(`PNJ créé par l'utilisateur ID ${req.utilisateur.id}`);

    // Code 201 = la création a réussi.
    res.status(201).json({
      message: `${nouveauPnj.nom} le ${nouveauPnj.classe} a rejoint la taverne !`,
      pnj: nouveauPnj,
    });
  } catch (erreur) {
    console.error("Erreur POST /api/pnj :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});


// PATCH /api/pnj/:id : changer le niveau d'un PNJ
// Route protégée : modifier des données exige d'être connecté.
app.patch("/api/pnj/:id", verifierToken, async (req, res) => {
  try {
    const id = req.params.id;
    const nouveauNiveau = req.body.niveau;

    // On vérifie l'id et le niveau.
    if (!estUnIdValide(id)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }
    if (!Number.isInteger(nouveauNiveau) || nouveauNiveau < 1) {
      return res
        .status(400)
        .json({ erreur: "Le champ 'niveau' doit être un entier ≥ 1" });
    }

    // On modifie le niveau dans la base.
    const resultat = await pool.query(
      "UPDATE Personnage SET niveau = $1 WHERE id = $2 RETURNING *",
      [nouveauNiveau, id],
    );

    // rowCount donne le nombre de lignes modifiées.
    // Si c'est 0, aucun PNJ n'a cet id.
    if (resultat.rowCount === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    res
      .status(200)
      .json({ message: "Niveau mis à jour !", pnj: resultat.rows[0] });
  } catch (erreur) {
    console.error("Erreur PATCH /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});


// DELETE /api/pnj/:id : supprimer un PNJ
// Route protégée : sinon n'importe qui pourrait vider la Taverne.
app.delete("/api/pnj/:id", verifierToken, async (req, res) => {
  try {
    const idCible = req.params.id;

    if (!estUnIdValide(idCible)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }

    // On supprime le PNJ dans la base.
    const resultat = await pool.query(
      "DELETE FROM Personnage WHERE id = $1",
      [idCible],
    );

    // Si rien n'a été supprimé, le PNJ n'existait pas.
    if (resultat.rowCount === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    res.status(200).json({ message: `Le PNJ numéro ${idCible} a été supprimé` });
  } catch (erreur) {
    console.error("Erreur DELETE /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});


// Gestion des erreurs générales
// But : toujours répondre en JSON, même en cas d'erreur.

app.use((req, res) => {
  res.status(404).json({ erreur: "Cette route n'existe pas dans la Taverne" });
});

// Ce bloc attrape les autres erreurs.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erreur: "Le corps de la requête n'est pas un JSON valide" });
  }
  console.error("Erreur inattendue :", err.message);
  res
    .status(500)
    .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
});

// On démarre le serveur sur le port choisi.
app.listen(PORT, () => {
  console.log(
    `Le serveur de la Taverne est ouvert sur http://localhost:${PORT}`,
  );
});
