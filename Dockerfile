# syntax=docker/dockerfile:1.7

# ---------- Stage 1: builder ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY angular.json tsconfig*.json ionic.config.json capacitor.config.ts karma.conf.js ./
COPY src ./src

RUN npm run build

# ---------- Stage 2: runtime (Nginx) ----------
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache wget \
 && rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/www /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
