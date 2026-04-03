# ---- Development stage ----
FROM node:20-alpine AS development

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install all dependencies (including devDependencies for dev)
RUN npm install --workspace=packages/shared --workspace=packages/backend

# Copy shared source and build it
COPY packages/shared/ ./packages/shared/
RUN npm run build -w packages/shared

# Copy backend source
COPY packages/backend/ ./packages/backend/

# Generate Prisma client
WORKDIR /app/packages/backend
RUN npx prisma generate

# Dev uses nodemon via tsx for hot reload
CMD ["npx", "nodemon"]

# ---- Build stage ----
FROM development AS build

WORKDIR /app/packages/backend
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN npm install --workspace=packages/shared --workspace=packages/backend --omit=dev

# Copy built shared package
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY packages/shared/package.json ./packages/shared/

# Copy built backend
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=build /app/packages/backend/public ./packages/backend/public
COPY --from=build /app/packages/backend/node_modules/.prisma ./packages/backend/node_modules/.prisma

# Create data directories
RUN mkdir -p /app/data/images /app/data/qrcodes /app/data/exports /app/data/floorplans

WORKDIR /app/packages/backend

EXPOSE 3001

CMD ["node", "dist/index.js"]
