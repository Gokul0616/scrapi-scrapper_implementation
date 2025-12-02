# Build stage
FROM node:20-alpine as build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm install --legacy-peer-deps

COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Add nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
