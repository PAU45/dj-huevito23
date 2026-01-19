# Imagen base con Node.js
FROM node:18-bullseye-slim

WORKDIR /app

# Copia archivos del bot y config
COPY . .

# Instala dependencias de la aplicación (bot/backend)
# Hacemos instalación de producción para las dependencias root
RUN npm install --production || npm install --legacy-peer-deps --production

# Construir frontend (si existe)
RUN if [ -d "frontend" ]; then \
            cd frontend && npm install --legacy-peer-deps && npm run build; \
        fi

# Da permisos de ejecución al script de arranque
RUN chmod +x start.sh

EXPOSE 3001

CMD ["./start.sh"]
