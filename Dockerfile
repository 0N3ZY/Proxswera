FROM node:20-slim
WORKDIR /app

# Enable corepack to handle pnpm automatically
RUN corepack enable && corepack prepare pnpm@12.17.0 --activate

# Copy dependency files first to cache installations
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy the rest of your project files into the container
COPY . .

# Expose Render's default port and set environment variables
EXPOSE 8080
ENV PORT=8080

# Start the application using pnpm
CMD ["pnpm", "dev"]
