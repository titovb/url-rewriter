FROM node:20.15.0-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json .
COPY pnpm-*.yaml .
COPY apps/api apps/api


FROM base AS prod-deps
RUN pnpm install --prod=true --frozen-lockfile


FROM base AS build
RUN pnpm install --prod=false --frozen-lockfile
RUN pnpm run build


FROM node:20.15.0-bookworm-slim
WORKDIR /app
COPY --from=prod-deps /app/node_modules /node_modules
COPY --from=prod-deps /app/apps/api/node_modules /apps/api/node_modules
COPY --from=build /app/apps/api/dist /apps/api/dist

CMD [ "node", "/apps/api/dist/main.js" ]
