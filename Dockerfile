FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build -w @vespera/shared && npm run build -w @vespera/api

ENV HOST=0.0.0.0
ENV PORT=4000
ENV PGLITE_PATH=/data/pglite
EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@vespera/api"]
