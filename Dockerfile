# Musebook 8004 indexer. Build from the repository root.
# Read-only: this image never sends transactions.
FROM node:20-bookworm-slim AS build
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
ENV NODE_ENV=production
ENV PORT=3005
ENV SVM8004_CLUSTER=devnet
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/indexer ./indexer
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3005)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "indexer/dist/index.js"]
