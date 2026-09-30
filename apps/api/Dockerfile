FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
# API 빌드에 필요한 의존성만 설치한다 (루트의 typescript 포함, Next.js 등 웹 의존성 제외).
RUN npm ci --workspace @yakuku-yaru/api --include-workspace-root

FROM node:22-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
# 운영 이미지에는 API 실행 의존성만 담는다.
RUN npm ci --workspace @yakuku-yaru/api --omit=dev

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api ./apps/api

RUN npm run build --workspace @yakuku-yaru/api

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/db ./apps/api/db

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "@yakuku-yaru/api"]
