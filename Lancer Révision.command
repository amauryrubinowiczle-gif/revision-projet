#!/bin/bash
# Double-cliquez ce fichier dans le Finder pour lancer l'application en mode développement
# (équivalent à taper `npm run tauri dev` dans un terminal, depuis ce dossier).
cd "$(dirname "$0")"
npm run tauri dev

echo ""
echo "L'application s'est fermée. Appuyez sur Entrée pour fermer cette fenêtre."
read -r
