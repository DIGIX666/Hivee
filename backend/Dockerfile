FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    docker.io \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install security scanners
RUN pip3 install bandit semgrep --break-system-packages
RUN npm install -g eslint
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p uploads agent_code logs sdk/abis

# Set non-root user
RUN useradd -m -u 1000 serviceuser && \
    chown -R serviceuser:serviceuser /app
USER serviceuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/server.js"]
