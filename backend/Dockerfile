# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server.js ./

# Runtime stage
FROM cgr.dev/chainguard/node:latest

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app .

EXPOSE 3000

CMD ["server.js"]