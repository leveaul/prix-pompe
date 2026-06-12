# ⛽ PrixPompe

Application web affichant les prix des carburants en temps réel près de votre position.

## Fonctionnalités

- 📍 Géolocalisation automatique
- 🗺️ Carte interactive avec marqueurs de prix
- ⛽ Filtres par type de carburant (Gazole, SP95, SP98, E10, E85, GPLc)
- 📏 Rayon de recherche ajustable (2 à 20 km)
- 🔄 Données officielles data.gouv.fr, mises à jour toutes les 10 minutes

## Stack

- **Frontend** : Next.js 14 (App Router) + TypeScript
- **Carte** : Leaflet / React-Leaflet
- **Styles** : Tailwind CSS
- **Données** : API officielle data.economie.gouv.fr
- **Déploiement** : Vercel

## Développement local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Source des données

Les données proviennent du jeu de données officiel **Prix des carburants en France** publié sur [data.gouv.fr](https://www.data.gouv.fr), sous Licence Ouverte.

API utilisée : `data.economie.gouv.fr` — flux instantané (mise à jour toutes les 10 minutes).
