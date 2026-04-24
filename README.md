# MegaHubGit 🚀

**Dashboard Git local** — gérez tous vos projets Git depuis une interface premium, avec intégration GitHub.

---

## Démarrage rapide

### Option 1 — Double-clic (recommandé)
```
start.bat
```
Le script installe automatiquement les dépendances au premier lancement, puis ouvre le navigateur.

### Option 2 — Manuel
```bash
# Terminal 1 — Backend
cd backend
npm install
npm start

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Ouvrir : **http://localhost:5173**

---

## Fonctionnalités

| Feature | Description |
|---|---|
| 📂 **Projects** | Lier un dossier local ou cloner depuis une URL |
| ⑂ **Git Status** | Voir les fichiers modifiés, staged, non trackés |
| ✓ **Stage / Unstage** | En 1 clic par fichier ou tous à la fois |
| 💬 **Commit** | Message + Ctrl+Enter pour commiter |
| ↑ **Push** | Pousser vers le remote en 1 clic |
| ⬇ **Pull / Fetch** | Synchroniser depuis le remote |
| ⑂ **Branches** | Créer, switcher, supprimer |
| 📦 **Stash** | Empiler/dépiler des WIP |
| 🔍 **Diff** | Visualiser les changements ligne par ligne |
| 📜 **Log** | Historique des commits |
| 🐙 **GitHub** | Voir repos, activité — via PAT |

---

## Configuration GitHub

1. Aller dans **Settings** de l'app
2. Générer un PAT sur [github.com → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens/new)
   - Scopes requis : `repo`, `read:user`
3. Coller le token dans l'app → **Connect GitHub**

Le token est stocké localement dans `%APPDATA%\MegaHubGit\config.json`.

---

## Architecture

```
MegaHubGit/
├── backend/          ← Express.js API (port 3001)
│   └── src/
│       ├── routes/   ← projects.js, git.js, github.js
│       └── services/ ← gitService.js, store.js
├── frontend/         ← Vite + React (port 5173)
│   └── src/
│       ├── pages/    ← Dashboard, Projects, GitPanel, Settings
│       ├── components/
│       ├── context/  ← AppContext
│       └── api/      ← API client
└── start.bat         ← Lanceur Windows
```

---

## Prérequis

- [Node.js](https://nodejs.org) ≥ 18
- [Git](https://git-scm.com) installé et dans le PATH
