# La Taverne aux PNJ

Application de gestion des Personnages Non Joueurs (PNJ) pour un Maître du Jeu.

| Partie | Technologie | Dossier | Adresse locale |
|---|---|---|---|
| API REST | Node.js, Express, PostgreSQL (Neon) | `/` (racine) | http://localhost:3000 |
| Front-end | Next.js (App Router), React | `front/` | http://localhost:3001 |

Le projet couvre trois TP :
1. **Les Fondations de la Taverne** : API REST, Pool PostgreSQL, requêtes paramétrées, gestion des erreurs.
2. **Le Vigile de la Taverne** : mots de passe hachés avec Bcrypt, authentification JWT, middleware de protection, CORS.
3. **Le Tableau de Bord du MJ** : interface Next.js (connexion, inventaire des PNJ, création sécurisée).

## Prérequis

- Node.js **20.9 ou plus récent**
- Le fichier `.env` de l'API (transmis en privé, il n'est pas versionné)

## Installation et lancement

### 1. Cloner le dépôt

```bash
git clone https://github.com/kw2cq74brx-dotcom/TAVERNE-Tableau-de-bord-MJ.git
cd TAVERNE-Tableau-de-bord-MJ
```

### 2. L'API (terminal n°1)

```bash
npm install
```

Placer le fichier `.env` reçu à la racine du projet.
Sans lui, partir du modèle `cp .env.example .env` et remplir les valeurs.

```bash
npm run dev
```

Le terminal doit afficher :
```
Le serveur de la Taverne est ouvert sur http://localhost:3000
✅ Connecté avec succès à la base de données PostgreSQL !
```

### 3. Le Front-end (terminal n°2)

```bash
cd front
cp .env.example .env.local
npm install
npm run dev
```

Ouvrir **http://localhost:3001** (et non 127.0.0.1 : le CORS n'autorise que `localhost:3001`).

### 4. Se connecter

Les identifiants du compte Maître du Jeu sont transmis en privé avec le `.env`.

Pour créer un autre compte, ou redéfinir le mot de passe d'un compte existant :

```bash
npm run create-mj -- <email> <motdepasse>
```

Le mot de passe est haché avec Bcrypt avant d'être enregistré : la base ne contient jamais de mot de passe en clair.

## Dépannage de la connexion

| Message affiché | Cause | Solution |
|---|---|---|
| « Email ou mot de passe incorrect. » | Identifiants mal saisis | Retaper le mot de passe à la main (un copier-coller peut ajouter un espace). Ou en définir un nouveau : `npm run create-mj -- <email> <motdepasse>` |
| « Trop de tentatives de connexion… » | Plus de 10 échecs en 15 minutes depuis la même adresse (protection anti force brute) | Attendre 15 minutes, ou redémarrer l'API en développement |
| « Impossible de contacter l'API… » | API éteinte, ou page ouverte sur une autre adresse que `http://localhost:3001` (le CORS la bloque) | Lancer l'API avec `npm run dev` et ouvrir exactement `http://localhost:3001` |
| « L'API ne parvient pas à joindre la base de données… » | L'API ne peut pas se connecter à Neon (`.env` absent ou mal nommé, réseau qui bloque le port 5432) | Vérifier que le fichier s'appelle bien `.env` à la racine, regarder le terminal de l'API, essayer depuis un autre réseau (partage de connexion) |

Au démarrage, le terminal de l'API doit afficher `✅ Connecté avec succès à la base de données PostgreSQL !`. Sinon, le problème vient du `.env` ou du réseau.

## Scripts de l'API

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance l'API et la redémarre à chaque modification |
| `npm start` | Lance l'API |
| `npm run init-db` | Crée les tables `Personnage` et `Utilisateur` (et 3 PNJ de départ) à partir de `schema.sql`. Inutile sur la base Neon fournie, déjà initialisée. |
| `npm run create-mj -- <email> <motdepasse>` | Crée ou met à jour un compte Maître du Jeu |

## Routes de l'API

| Méthode | Route | Protection | Rôle |
|---|---|---|---|
| POST | `/api/auth/login` | Publique, limitée à 10 échecs / 15 min | Échange `{ email, password }` contre un JWT (renvoyé dans un cookie HttpOnly et dans la réponse) |
| GET | `/api/auth/session` | JWT | Indique qui est connecté (utilisé par le Front au chargement) |
| POST | `/api/auth/logout` | Publique | Efface le cookie du badge |
| GET | `/api/pnj` | Publique | Liste des PNJ |
| GET | `/api/pnj/:id` | Publique | Détail d'un PNJ |
| POST | `/api/pnj` | JWT + rôle MJ | Crée un PNJ `{ nom, classe, niveau }` |
| PATCH | `/api/pnj/:id` | JWT + rôle MJ | Modifie le niveau `{ niveau }` |
| DELETE | `/api/pnj/:id` | JWT + rôle MJ | Supprime un PNJ |

Le badge est accepté de deux façons :
- **Cookie HttpOnly** `token_taverne` : utilisé par le Front, envoyé automatiquement par le navigateur.
- **En-tête** `Authorization: Bearer <token>` : pratique pour tester avec Postman.

Sans badge : **401**. Badge falsifié ou expiré : **403**. Badge valide mais rôle autre que `Maitre_Du_Jeu` : **403**. Trop de tentatives de connexion : **429**.

## Sécurité

| Mesure | Où |
|---|---|
| Mots de passe hachés avec Bcrypt (jamais en clair) | `create-mj.js`, `server.js` |
| Authentification stateless par JWT signé (HS256, 1 h) | `server.js`, `middlewares/auth.js` |
| Contrôle du rôle (`exigerRole`) sur les routes de modification | `middlewares/auth.js` |
| Badge stocké dans un cookie **HttpOnly + SameSite=Strict** (illisible par le JavaScript, donc protégé du vol par XSS) | `server.js`, `front/app/components/session.js` |
| Limitation des tentatives de connexion (anti force brute) | `server.js` (express-rate-limit) |
| En-têtes HTTP de sécurité | `server.js` (helmet) |
| CORS limité à `http://localhost:3001` | `server.js` |
| Requêtes SQL paramétrées (anti injection) | `server.js`, `create-mj.js` |
| Secrets dans `.env`, jamais versionné | `.gitignore` |

## Variables d'environnement

**API (`.env`)**, voir `.env.example` :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (Neon) |
| `PORT` | Port de l'API (3000) |
| `JWT_SECRET` | Clé secrète qui signe les JWT |
| `JWT_EXPIRES_IN` | Durée de validité d'un badge (ex : `1h`) |
| `FRONTEND_URL` | Seule origine autorisée par le CORS (`http://localhost:3001`) |

**Front (`front/.env.local`)**, voir `front/.env.example` :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | Adresse de l'API (`http://localhost:3000`) |

## Structure du projet

```
.
├── server.js              # Serveur Express et routes
├── db.js                  # Pool de connexions PostgreSQL
├── middlewares/auth.js    # Le Vigile : vérification du JWT
├── schema.sql             # Tables Personnage et Utilisateur
├── init-db.js             # Exécute schema.sql
├── create-mj.js           # Crée un compte MJ (mot de passe haché)
└── front/                 # Application Next.js
    └── app/
        ├── page.js        # Page d'accueil (Server Component)
        └── components/    # Connexion, tableau de bord, formulaire d'ajout…
```
