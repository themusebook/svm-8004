# Musebook 8004 indexer. Build from the repository root.
# Read-only: this image never sends transactions. Devnet only.
FROM node:20-bookworm-slim AS build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
COPY indexer/package.json indexer/package.json
COPY tsconfig.json tsconfig.json
COPY src src
COPY indexer/src indexer/src
COPY indexer/tsconfig.json indexer/tsconfig.json
RUN npm install --no-audit --no-fund && npm run build && npm run build --workspace=@musebook/svm-8004-indexer

FROM node:20-bookworm-slim
WORKDIR /app
RUN mkdir -p /data
ENV NODE_ENV=production
ENV SVM8004_CLUSTER=devnet
ENV DATABASE_URL=sqlite:/data/indexer.db
# Railway injects PORT at runtime; default locally.
ENV PORT=3005
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/indexer ./indexer
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3005)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "indexer/dist/index.js"]
