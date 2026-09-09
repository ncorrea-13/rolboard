# syntax=docker/dockerfile:1
FROM node:26-alpine AS builder

WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@12 && pnpm install --frozen-lockfile

COPY . ./
RUN pnpm build

FROM caddy:2-alpine

COPY --from=builder /build/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
