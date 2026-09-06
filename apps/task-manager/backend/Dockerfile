FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace=backend
COPY backend backend
USER node
EXPOSE 3001
CMD ["node", "backend/src/server.js"]
