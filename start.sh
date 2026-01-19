#!/bin/bash
set -e
# Lanzar backend desde su carpeta (para que las rutas relativas al frontend funcionen)
# Si existe frontend y no hay build, construimos el frontend (útil fuera de Docker)
if [ -d "frontend" ]; then
	if [ ! -d "frontend/build" ]; then
		echo "Frontend detectado pero no construido. Construyendo frontend..."
		(cd frontend && npm install --legacy-peer-deps && npm run build)
		echo "Frontend construido."
	else
		echo "Frontend ya construido."
	fi
fi

# Lanzar backend desde su carpeta (para que las rutas relativas al frontend funcionen)
cd backend
node index.js &
sleep 1
# Volver al root del proyecto y lanzar el bot Node.js en foreground
cd ..
node bot.js
