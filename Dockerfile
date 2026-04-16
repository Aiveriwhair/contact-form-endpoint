# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY src ./src

# Compiler TypeScript
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copier package.json pour les dépendances de production
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Copier les fichiers compilés depuis le builder
COPY --from=builder /app/dist ./dist
COPY src/templates ./src/templates
COPY src/config ./src/config

# Créer le dossier logs
RUN mkdir -p logs && chown -R node:node /app

# Utiliser un utilisateur non-root
USER node

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "dist/index.js"]
