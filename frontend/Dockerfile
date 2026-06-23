FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Expose Next.js server port
EXPOSE 3000

# Start in development mode for easy hot-reloading and local testing
CMD ["npm", "run", "dev"]
