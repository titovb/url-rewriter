FROM node:20.15.0-bookworm-slim
ENV NODE_ENV=production

WORKDIR /app

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

COPY package*.json ./
RUN npm ci --include=dev
COPY . .

RUN npm run build
RUN npm prune
RUN rm -rf src

ENTRYPOINT ["/tini", "--"]

CMD npm run start
