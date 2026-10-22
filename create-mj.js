// Fichier : create-mj.js
// Ce script crée un compte Maître du Jeu dans la table Utilisateur.
// On le lance avec : npm run create-mj -- <email> <motdepasse>
// Le mot de passe est haché avec Bcrypt AVANT d'être envoyé à la base :
// seule l'empreinte (ex: $2b$10$...) est enregistrée, jamais le texte en clair.
const bcrypt = require("bcrypt");
const pool = require("./db");

// 10 = le "coût" du hachage (standard actuel).
const SALT_ROUNDS = 10;

async function creerMaitreDuJeu() {
  // process.argv contient les mots tapés après la commande.
  const [email, motDePasse] = process.argv.slice(2);

  if (!email || !motDePasse) {
    console.error("Usage : npm run create-mj -- <email> <motdepasse>");
    process.exitCode = 1;
    return pool.end();
  }

  try {
    // Bcrypt génère le sel tout seul et le range dans l'empreinte.
    const motDePasseHache = await bcrypt.hash(motDePasse, SALT_ROUNDS);

    // Requête paramétrée ($1, $2) pour éviter les injections SQL.
    // Si l'email existe déjà, on met simplement à jour son mot de passe.
    const resultat = await pool.query(
      `INSERT INTO Utilisateur (email, mot_de_passe, role)
       VALUES ($1, $2, 'Maitre_Du_Jeu')
       ON CONFLICT (email) DO UPDATE SET mot_de_passe = EXCLUDED.mot_de_passe
       RETURNING id, email, role`,
      [email.trim().toLowerCase(), motDePasseHache],
    );

    console.log("Compte prêt :", resultat.rows[0]);
  } catch (erreur) {
    console.error("Échec de la création du compte :", erreur.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

creerMaitreDuJeu();
