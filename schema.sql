-- Fichier : schema.sql
-- Ce fichier crée la table des PNJ.
-- On le lance avec : npm run init-db (ou dans l'éditeur SQL de Neon).
-- "IF NOT EXISTS" : si la table existe déjà, rien n'est modifié.

CREATE TABLE IF NOT EXISTS Personnage (
    id     SERIAL PRIMARY KEY,                          -- numéro créé automatiquement (1, 2, 3...)
    nom    VARCHAR(100) NOT NULL,                       -- NOT NULL = champ obligatoire
    classe VARCHAR(50)  NOT NULL,
    niveau INTEGER      NOT NULL DEFAULT 1 CHECK (niveau >= 1)  -- le niveau doit être au moins 1
);

-- On ajoute 3 PNJ de départ, seulement si la table est vide.
INSERT INTO Personnage (nom, classe, niveau)
SELECT * FROM (VALUES
    ('Gimli',   'Guerrier', 10),
    ('Gandalf', 'Mage',     20),
    ('Legolas', 'Archer',   15)
) AS v(nom, classe, niveau)
WHERE NOT EXISTS (SELECT 1 FROM Personnage);

-- Table des comptes (Maîtres du Jeu).
-- On ne stocke JAMAIS le mot de passe en clair : seulement son empreinte Bcrypt.
-- Le compte est créé avec : npm run create-mj -- <email> <motdepasse>
CREATE TABLE IF NOT EXISTS Utilisateur (
    id           SERIAL PRIMARY KEY,
    email        VARCHAR(255) NOT NULL UNIQUE,              -- UNIQUE = deux comptes ne peuvent pas avoir le même email
    mot_de_passe VARCHAR(60)  NOT NULL,                     -- une empreinte Bcrypt fait toujours 60 caractères
    role         VARCHAR(30)  NOT NULL DEFAULT 'Maitre_Du_Jeu'
);
