FROM node:20.15.0-bookworm-slim AS node
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json .
COPY pnpm-*.yaml .
COPY apps/web apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:1.26.1

COPY --from=node /app/apps/web/dist /usr/share/nginx/html
COPY /apps/web/nginx.conf /etc/nginx/conf.d/default.conf
