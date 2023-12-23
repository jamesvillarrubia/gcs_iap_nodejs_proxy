# Specify the base image
FROM node:20-alpine

# Specify the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install express and request packages
RUN npm install

# Bundle the app source inside the Docker image
COPY . .

# Expose the port express is running on
EXPOSE $PROXY_PORT

# Start the express server
CMD [ "node", "app.js" ]