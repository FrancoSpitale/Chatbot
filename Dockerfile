# Usando el builder pattern para construir la aplicación
FROM node:21-alpine3.18 as builder

# Habilitar Corepack y preparar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/pnpm-global
ENV PATH=$PNPM_HOME:$PATH

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar los archivos de definición de paquete
COPY package*.json pnpm-lock.yaml ./

# Instalar git y cualquier otra dependencia necesaria
RUN apk add --no-cache git 

# Copiar el código fuente de la aplicación al contenedor
COPY . .

# Instalar las dependencias y construir el proyecto
RUN pnpm -v
RUN ls -la
RUN pnpm build


# Etapa de producción para ejecutar la aplicación
FROM node:21-alpine3.18 as deploy

# Definir variables de entorno para la etapa de producción
ARG RAILWAY_STATIC_URL
ARG PUBLIC_URL
ARG PORT

# Copiar los archivos de construcción del 'builder' a la etapa de producción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Instalar solo las dependencias de producción
RUN pnpm install --frozen-lockfile --production

# Exponer el puerto en el que corre la aplicación
EXPOSE $PORT

# Definir el comando para iniciar la aplicación
CMD ["pnpm", "start"]
