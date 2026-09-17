FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8787

# Migrations are idempotent, so a restart can safely ensure the schema exists.
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
