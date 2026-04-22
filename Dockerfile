# 1. Start with a lightweight Linux machine that has Node.js installed
FROM node:20-alpine

# 2. Create a folder inside the container for our app
WORKDIR /app

# 3. Copy only the package files first (this makes future builds much faster)
COPY package.json package-lock.json ./

# 4. Install all dependencies inside the container
RUN npm install

# 5. Copy the rest of your actual code into the container
COPY . .

# 6. Build the Next.js production code
RUN npm run build

# 7. Expose port 3000 so our local browser can see it
EXPOSE 3000

# 8. The command to start the app when the container turns on
CMD ["npm", "start"]