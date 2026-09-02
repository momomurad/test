# Stage 1: Dependency builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY app.js package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
USER node
CMD ["node", "app.js"]
