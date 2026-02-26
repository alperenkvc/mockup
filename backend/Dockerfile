FROM node:20-alpine

#directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the code
COPY . .

#port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]