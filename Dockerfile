FROM node:20-alpine AS build
WORKDIR /app
COPY . /app/

# No build step needed - it's a static frontend

FROM nginx:alpine
COPY --from=build /app /usr/share/nginx/html
EXPOSE 6000
CMD ["nginx", "-g", "daemon off;"]
