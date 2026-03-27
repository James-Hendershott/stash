# ---- Development stage ----
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/admin/package.json ./packages/admin/

RUN npm install --workspace=packages/shared --workspace=packages/admin

COPY packages/shared/ ./packages/shared/
RUN npm run build -w packages/shared

COPY packages/admin/ ./packages/admin/

WORKDIR /app/packages/admin

EXPOSE 3002

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3002"]

# ---- Build stage ----
FROM development AS build

WORKDIR /app/packages/admin
RUN npm run build

# ---- Production stage ----
FROM nginx:alpine AS production

COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/admin/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
