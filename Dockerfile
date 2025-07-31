FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 🔑 Rigenera Prisma Client nel container
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "start"]