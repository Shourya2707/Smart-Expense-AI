FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# better-sqlite3 may compile from source when a matching prebuilt binary is
# unavailable. Keep the runtime image slim while providing node-gyp's build
# prerequisites during dependency installation.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHON=/usr/bin/python3 \
    npm_config_python=/usr/bin/python3

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /app/server/data
ENV DATA_DIR=/app/server/data
ENV PORT=5000
EXPOSE 5000
CMD ["node", "server/server.js"]
