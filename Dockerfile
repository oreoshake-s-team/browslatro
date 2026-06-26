# syntax=docker/dockerfile:1

# Stage 1: Build the Vite single-page app.
# Browslatro is a static React SPA built with Yarn 4 (Berry), so we install
# with the bundled Yarn release and run the project's build script, which
# emits static assets into ./build (see vite.config.ts outDir).
FROM node:22-slim AS build

WORKDIR /usr/src/app

# Corepack ships with Node 22 and activates the Yarn version pinned in
# .yarnrc.yml (yarnPath -> .yarn/releases/yarn-4.15.0.cjs).
RUN corepack enable

# Copy only what Yarn needs to resolve and install dependencies first so the
# install layer is cached when application source changes.
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

# Copy the rest of the source and produce the production build (tsc && vite build).
COPY . .
RUN yarn build

# Stage 2: Serve the static build with nginx.
# nginx listens on 8080 to match fly.toml's internal_port, and falls back to
# index.html so client-side routes resolve correctly for the SPA.
FROM nginx:1.27-alpine

RUN printf 'server {\n\
    listen 8080;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=build /usr/src/app/build /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
