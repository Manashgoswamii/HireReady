# Use an official Node.js runtime as base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema (for generation)
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of your application
COPY . .

# Expose the backend port
EXPOSE 4000

# Set environment variables here if needed, or rely on env_file in docker-compose

# Start the server
CMD ["npm", "run", "dev"]
