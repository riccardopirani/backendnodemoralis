FROM node:18-alpine

# Install required packages including OpenSSL, bash, jq, and curl
RUN apk add --no-cache openssl bash jq curl

WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# ✅ Generate Prisma Client inside the container
# This ensures it’s built for Linux musl (Alpine)
RUN npx prisma generate

EXPOSE 4000

# Set default environment variable
ENV PORT=4000

CMD ["npm", "start"]