# Changelog

## [1.0.0] - 2026-03-14

### ✨ Fonctionnalités principales

#### Système de base
- **INIT**: Initialisation de dossiers MemoryWell avec structure automatique
- **PUSH**: Archivage automatique avec numérotation et horodatage
- **POP**: Restauration d'archives avec reconstruction intelligente
- **FIND**: Recherche avancée dans les archives (date, nom, extension, contenu)
- **SETFAVORITE**: Gestion des archives favorites

#### Organisation temporelle
- Liens symboliques automatiques par période:
  - `01-last-week/` - Archives de la dernière semaine
  - `02-last-month/` - Archives du dernier mois
  - `03-last-year/` - Archives de la dernière année
  - `04-before/` - Archives plus anciennes
- Dossier `05-favorite/` avec lien `00-last` vers la dernière archive

#### Système DELTA
- Mode IMAGE: Sauvegarde complète (par défaut)
- Mode DELTA: Sauvegarde incrémentielle (option `--usedelta`)
- Comparaison intelligente par date et taille de fichier
- Reconstruction automatique depuis l'IMAGE de base
- Métadonnées `.memorywell-meta.json` pour traçabilité

#### Interface graphique (GUI)
- Option `--gui` pour créer des applications cliquables
- **macOS**: Applications `.app` natives avec AppleScript
- **Linux**: Scripts `.sh` avec zenity
- 4 applications: Push, Pop, Find, SetFavorite
- Boîtes de dialogue système natives

#### Installation système
- Script `install.sh` pour installation globale
- Commandes CLI: `mwinit`, `mwpush`, `mwpop`, `mwfind`, `mwsetfavorite`
- Installation dans `~/.memorywell` et `~/.local/bin`
- Script `uninstall.sh` pour désinstallation propre

### 🎯 Caractéristiques uniques

- Dossiers simples et visibles (pas de format propriétaire)
- Navigation directe dans les archives via Finder/Explorer
- Workflow push/pop intuitif
- Organisation temporelle automatique
- Système de favoris intégré
- Pas de dépendances externes (sauf Node.js)

### 📦 Fichiers inclus

**Scripts principaux:**
- `init.js` - Initialisation
- `push.js` - Archivage
- `pop.js` - Restauration
- `find.js` - Recherche
- `setfavorite.js` - Gestion favoris

**GUI:**
- `gui-helpers.js` - Utilitaires GUI
- `gui-push.js` - GUI Push
- `gui-pop.js` - GUI Pop
- `gui-find.js` - GUI Find
- `gui-setfavorite.js` - GUI SetFavorite

**Installation:**
- `install.sh` - Installation système
- `uninstall.sh` - Désinstallation
- `package.json` - Configuration npm

**Documentation:**
- `README.md` - Documentation complète
- `CHANGELOG.md` - Historique des versions
- `VERSION` - Numéro de version

### 🔧 Compatibilité

- **macOS**: Testé et fonctionnel (GUI native)
- **Linux**: Testé et fonctionnel (nécessite zenity pour GUI)
- **Node.js**: Requis (version 12+)

### 📝 Notes

Cette version 1.0 est prête pour:
- Publication sur GitHub
- Présentation vidéo
- Utilisation en production

Améliorations futures possibles:
- Compression automatique des anciennes archives
- Système FADE (expiration automatique)
- Mirror vers disque externe
- Vérification d'intégrité
