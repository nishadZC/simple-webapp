FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

# Updated runtime image
FROM gcr.io/distroless/nodejs22-debian12:latest

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.js ./server.js

EXPOSE 3000

CMD ["server.js"]