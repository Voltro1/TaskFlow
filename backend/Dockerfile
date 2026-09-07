FROM node:20-alpine
WORKDIR /app
COPY package*.json ./

# install production dependencies
RUN npm ci --omit=dev

# copy application source
COPY src ./src
COPY sql ./sql

# start api process
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]