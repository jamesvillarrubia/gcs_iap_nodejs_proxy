# Build stage
FROM node:20.2.0-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production




# Runtime stage
FROM node:20.2.0-alpine

ENV PROXY_PORT=3000
ENV BUCKET_HOST=https://storage.googleapis.com
ENV BUCKET_NAME=your-bucket-name
ENV RATE_LIMIT_ENABLED=false
ENV RATE_LIMIT_WINDOW_MS=900000
ENV RATE_LIMIT_MAX=100
ENV CACHE_DURATION=20000
ENV CACHE_ENABLED=false


# Specify the working directory in the Docker image
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port express is running on
EXPOSE $PROXY_PORT

# Start the express server
CMD [ "npm", "start" ]