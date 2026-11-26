FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
USER root
RUN nginx_repo="https://nginx.org/packages/alpine/v$(cut -d. -f1,2 /etc/alpine-release)/main" \
    && apk add --no-cache --repository "$nginx_repo" \
        'nginx>=1.30.7' nginx-module-xslt nginx-module-geoip nginx-module-image-filter nginx-module-njs \
    && apk upgrade --no-cache --repository "$nginx_repo"
USER 101
COPY --from=build /app/dist/agent-orchestrator/browser /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
ENV AO_API_URL=http://api:8080 NGINX_ENVSUBST_FILTER=^AO_API_URL$
EXPOSE 8080
