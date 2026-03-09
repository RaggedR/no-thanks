# Stage 1: Build client
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=server-build /app/dist ./dist
COPY --from=client-build /app/client/dist ./client/dist
COPY weights.json ./

ENV NODE_ENV=production
EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/server/index.js"]
