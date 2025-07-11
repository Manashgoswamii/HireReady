FROM node:18
WORKDIR /app

COPY package* .
COPY ./prisma .
    
RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 4000
CMD ["npm", "run", "dev"]
