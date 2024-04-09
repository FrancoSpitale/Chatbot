# Use a specific hash for reproducibility
FROM node:21-alpine3.18 as builder

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/pnpm-global
ENV PATH="$PNPM_HOME:$PATH"

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install Git and any other dependencies
RUN apk add --no-cache git 

# Copy the source code
COPY . .

# Install dependencies
RUN pnpm i

# Show what's in our working directory
RUN ls -al

# Attempt to build, log the output to a file for troubleshooting
RUN pnpm build | tee build.log

# Production stage
FROM node:21-alpine3.18 as deploy

# Set non-root user and add user to avoid permission issues
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy built assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy package files from the builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies
RUN pnpm install --frozen-lockfile --production

# Set non-root user to run your application
USER appuser

# Set environment variables (if needed, replace with your own or pass through --build-arg)
ARG RAILWAY_STATIC_URL
ARG PUBLIC_URL
ARG PORT

ENV RAILWAY_STATIC_URL=${RAILWAY_STATIC_URL}
ENV PUBLIC_URL=${PUBLIC_URL}
ENV PORT=${PORT}

# Expose the port the app runs on
EXPOSE $PORT

# Define the command to run the app
CMD ["pnpm", "start"]

