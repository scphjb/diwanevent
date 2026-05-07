# --- [Stage 1: Build] ---
FROM node:18-slim as build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- [Stage 2: Production] ---
FROM nginx:stable-alpine as production-stage

# نسخ ملف الإعدادات الاحترافي (سننشئه في الخطوة التالية)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
