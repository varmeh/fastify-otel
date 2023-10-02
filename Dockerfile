# Use an official Node.js runtime as a base image
FROM node:20.8.0-alpine3.18 AS build-stage

# Set the working directory inside the container
WORKDIR /usr/src

# Install app dependencies by copying package*.json files first
COPY package*.json ./
RUN npm install --production

# Copy rest of the source code
COPY . .


# Multi-stage build for smaller image size
FROM node:20.8.0-alpine3.18

WORKDIR /usr/src

# Copy node modules and compiled sources from build-stage
COPY --from=build-stage /usr/src /usr/src

# Expose port 3000 for the app to listen on
EXPOSE 3000

# Use a more robust command to start the app
CMD ["npm", "start"]
