FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE_URL=""
ARG VITE_BAIDU_TONGJI_ID=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BAIDU_TONGJI_ID=$VITE_BAIDU_TONGJI_ID
RUN pnpm build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
