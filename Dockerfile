# Specify the base image
FROM node:20

# Specify the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install express and request packages
RUN npm install express request

# Bundle the app source inside the Docker image
COPY . .

# Expose the port express is running on
EXPOSE 3000

# Start the express server
CMD [ "node", "app.js" ]
