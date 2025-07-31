FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ✅ Generate Prisma Client inside container
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "start"]