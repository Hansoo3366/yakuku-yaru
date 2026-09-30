FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
# 웹 빌드에 필요한 의존성만 설치한다 (루트의 typescript 포함, API 의존성 제외).
RUN npm ci --workspace @yakuku-yaru/web --include-workspace-root

FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL=contact@yakuku-yaru.today
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web ./apps/web

RUN npm run build --workspace @yakuku-yaru/web

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Docker 가 HOSTNAME 을 컨테이너 id 로 채우므로 모든 인터페이스에서 받도록 지정한다.
ENV HOSTNAME=0.0.0.0

# output: 'standalone' 결과물: 실행에 필요한 파일과 추적된 node_modules 만 들어 있다.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
