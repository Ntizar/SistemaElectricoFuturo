FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY . .

# Configurar nginx para escuchar en puerto 6000
RUN sed -i 's/listen\s*80;/listen 6000;/g' /etc/nginx/conf.d/default.conf \
    && sed -i 's/listen\s*\[::]\:80;/listen [::]:6000;/g' /etc/nginx/conf.d/default.conf

EXPOSE 6000

# Healthcheck ligero para NaN.builders
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:6000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
