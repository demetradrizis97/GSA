# Use a lightweight Nginx image
FROM nginx:alpine

# Copy website files into Nginx's default HTML directory
COPY index.html /usr/share/nginx/html/index.html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
