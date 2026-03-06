# 📊 Agent Data Analyst IA - data.gouv.fr

![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Blue?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_3_Flash-Google_AI-blue?style=for-the-badge&logo=google)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

Une application web intelligente qui transforme le langage naturel en infographies à partir des données publiques françaises (Open Data). Posez une question, l'IA cherche le bon jeu de données sur **data.gouv.fr**, nettoie les données, effectue les calculs et génère une visualisation prête à être partagée.

## ✨ Fonctionnalités Principales

- 🔍 **Recherche sémantique :** Interrogation directe de l'API data.gouv.fr via le modèle Gemini 3 Flash.
- 🛡️ **Streaming & Protection Mémoire :** Lecture en flux (stream) des fichiers CSV volumineux avec un coupe-circuit à 5 Mo pour éviter les crashs du navigateur.
- ⚙️ **Moteur de Data Science "Client-Side" :** 
  - Nettoyage automatique des formats de nombres complexes (ex: "1 000,50" -> `1000.50`).
  - Filtrage avancé (`eq`, `contains`, `gt`, `lt`).
  - Agrégation de données à la volée (`sum`, `avg`, `count`).
- 🧠 **IA Augmentée :** L'IA analyse un échantillon du fichier et sa taille totale pour configurer les axes, les filtres, et générer des avertissements si la donnée est trop complexe ou tronquée.
- 📸 **Génération d'Infographies :** Export en un clic de la "Data Card" (Titre, Source, Graphique, Avertissements) au format PNG pour les réseaux sociaux.

## 🛠️ Stack Technique

- **Framework :** Next.js (App Router)
- **Langage :** TypeScript
- **Styling :** Tailwind CSS + Lucide Icons
- **Visualisation :** Recharts
- **Parsing CSV :** PapaParse
- **Export Image :** html-to-image
- **IA :** `@google/genai` (Gemini API)

## 🚀 Comment ça marche ?

1. **L'utilisateur** pose une question (ex: *"Quelle est l'évolution des naissances en France ?"*).
2. **L'IA (Gemini)** utilise un outil pour chercher des datasets pertinents sur data.gouv.fr.
3. **L'IA** sélectionne un fichier CSV, lit ses en-têtes, sa taille et un échantillon de 10 lignes.
4. **L'IA** génère une configuration JSON contenant : la réponse textuelle, les axes X/Y, les filtres à appliquer et l'agrégation mathématique nécessaire.
5. **Le Frontend** télécharge le CSV (via un proxy pour contourner les CORS), passe les données dans le moteur de traitement (nettoyage, filtrage, agrégation) et affiche le graphique interactif.

## 💻 Installation en local

1. Clonez le dépôt :
```bash
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
cd VOTRE_REPO
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez les variables d'environnement :
Créez un fichier `.env.local` à la racine du projet et ajoutez votre clé API Google Gemini :
```env
NEXT_PUBLIC_GEMINI_API_KEY=votre_cle_api_gemini_ici
```

4. Lancez le serveur de développement :
```bash
npm run dev
```

5. Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🤝 Contribution
Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

---
*Projet conçu avec Google AI Studio.*
