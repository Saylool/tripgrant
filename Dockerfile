FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:26-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production SOLANA_NETWORK=devnet DEMO_MODE=false HOST=0.0.0.0 PORT=5173
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/vendor ./vendor
RUN mkdir -p .local/data && chown -R node:node /app
USER node
VOLUME ["/app/.local/data"]
EXPOSE 5173
CMD ["./node_modules/.bin/tsx", "server/index.ts"]
