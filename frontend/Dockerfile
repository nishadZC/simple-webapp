# =============================================================================
# Frontend Dockerfile
# -----------------------------------------------------------------------------
# This Dockerfile creates a Docker image for the frontend application.
# It uses the official Nginx image to serve static files
# (HTML, CSS, JavaScript).
#
# Nginx also acts as a reverse proxy, forwarding API requests
# (/api) to the backend service running inside the Kubernetes cluster.
# =============================================================================

# Use the official Nginx image as the base image.
# "latest" downloads the newest stable version.
FROM nginx:1.29-bookworm
# ---------------------------------------------------------------------------
# Copy frontend files into Nginx's default web directory.
#
# /usr/share/nginx/html is the folder from which Nginx serves webpages.
# ---------------------------------------------------------------------------

# Copy the HTML page
COPY index.html /usr/share/nginx/html/

# Copy the JavaScript file
COPY app.js /usr/share/nginx/html/

# ---------------------------------------------------------------------------
# Create a custom Nginx configuration.
#
# The default configuration is replaced using shell commands.
# This configuration:
#   1. Serves the frontend application.
#   2. Redirects API requests to the backend service.
# ---------------------------------------------------------------------------

RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    \
    # Listen for HTTP requests on port 80
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    \
    # Handle requests for frontend files
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    \
    # Root directory containing HTML and JavaScript files
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    \
    # Default webpage
    echo '        index index.html;' >> /etc/nginx/conf.d/default.conf && \
    \
    # If the requested file does not exist,
    # always return index.html.
    # Useful for Single Page Applications (SPA).
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    \
    # ------------------------------------------------------------
    # Reverse Proxy Configuration
    #
    # Any request beginning with /api is forwarded
    # to the backend Kubernetes Service.
    # ------------------------------------------------------------
    echo '    location /api {' >> /etc/nginx/conf.d/default.conf && \
    \
    # Forward requests to the backend Service.
    # Kubernetes automatically resolves "backend-service"
    # using its internal DNS.
    echo '        proxy_pass http://backend-service:3000;' >> /etc/nginx/conf.d/default.conf && \
    \
    # Forward the original host name
    echo '        proxy_set_header Host $host;' >> /etc/nginx/conf.d/default.conf && \
    \
    # Forward the client's IP address
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    \
    echo '}' >> /etc/nginx/conf.d/default.conf

# ---------------------------------------------------------------------------
# Inform Docker that the container listens on port 80.
#
# EXPOSE does not publish the port.
# It simply documents which port the application uses.
# ---------------------------------------------------------------------------
EXPOSE 80