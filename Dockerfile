# Use a specific version of node with Alpine for reproducibility
FROM node:21-alpine3.18 as builder

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/pnpm-global
ENV PATH="$PNPM_HOME:$PATH"

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install Git and any other dependencies you might need
RUN apk add --no-cache git 

# Copy the source code into the container
COPY . .

# Install dependencies
RUN pnpm i

# Log what's in our working directory
RUN ls -al

# Build the application, log the output for troubleshooting
RUN pnpm build | tee build.log

# Check if 'dist' directory was created
RUN if [ ! -d "dist" ]; then echo "Build failed: 'dist' directory not found"; exit 1; fi

# Production stage
FROM node:21-alpine3.18 as deploy

# Create a non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy built assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy package files from the builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install only production dependencies
RUN pnpm install --frozen-lockfile --production

# Set necessary environment variables (if needed, replace or pass through --build-arg)
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

