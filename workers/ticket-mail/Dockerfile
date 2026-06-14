FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY workers/ticket-mail ./workers/ticket-mail

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "workers/ticket-mail/worker.mjs"]
