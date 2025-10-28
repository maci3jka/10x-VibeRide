# VibeRide

![version badge](https://img.shields.io/badge/version-0.0.1-blue.svg)

## Table of Contents
1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

## Project Description
VibeRide is an online-first, responsive web application that helps motorcycle enthusiasts quickly transform simple trip notes into engaging, high-level itineraries and downloadable GPX 1.1 files. The MVP targets three core rider personas—weekend group riders, after-work short-loop riders, and long-trip tourers—providing them with an AI-assisted planning flow that starts from a plain-text note and ends with an itinerary ready for the road.

Core flow: sign in with Google → complete riding preferences profile → create/edit a note → generate itinerary → review/regenerate → download GPX (after safety disclaimer) → browse past notes.

All data is stored in Supabase, AI generation is handled by OpenAI via Openrouter, and the entire app can be run locally in Docker or using Node.

## Tech Stack
### Frontend
- Astro 5
- React 19
- TypeScript 5
- Tailwind CSS 4
- Shadcn/ui

### Backend & Data
- Supabase (PostgreSQL & Auth)

### AI & Integrations
- Openrouter.ai (OpenAI compatible)

### Tooling & DevOps
- ESLint, Prettier, Husky, lint-staged
- Docker (local development)
- GitHub Actions (CI)
- DigitalOcean (target hosting)

## Getting Started Locally
### Prerequisites
```bash
# Recommended Node version
nvm install 22.14.0
nvm use 22.14.0

# Package manager (optional if already up-to-date)
npm install -g npm@latest
```

### Installation
1. Clone the repository:
```bash
git clone https://github.com/your-org/VibeRide.git
cd VibeRide
```
2. Install dependencies:
```bash
npm install
```
3. Configure environment variables:
```bash
# Create a `.env` file at the project root and populate the variables below
```
Required variables:
- `OPENAI_API_KEY` – OpenAI or Openrouter compatible key
- `OPENAI_MONTHLY_SPEND_CAP` – e.g. `50`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

4. Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:4321`.

## Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Astro dev server with hot reload |
| `npm run build` | Generate production build |
| `npm run preview` | Preview production build locally |
| `npm run astro` | Run arbitrary Astro CLI commands |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run format` | Format codebase with Prettier |

## Project Scope
### In Scope (MVP)
- Google OAuth authentication
- User profile with riding preferences
- Plain-text notes CRUD (≤ 1 500 chars)
- AI-generated high-level itineraries
- GPX 1.1 export streamed to browser
- Safety disclaimer modal
- Basic analytics via DB queries
- Containerized local setup

### Out of Scope (Deferred)
- Plan sharing between users
- Turn-by-turn routing
- Multimedia inputs (photos, videos)
- Advanced logistics planning
- Version history of itineraries
- Fine-grained OpenAI spend tracking per user
- CI/CD pipeline & backups
- Full accessibility & GDPR compliance

For the exhaustive list see `.ai/prd.md` §4.

## Project Status
🛠️ **In active development** — MVP features are currently being built. Track progress in the [issues](https://github.com/your-org/VibeRide/issues) section.

## License
This project is licensed under the MIT License.
