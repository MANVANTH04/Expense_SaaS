# Use official Python slim image
FROM python:3.11-slim

# Environment
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend ./backend

# Expose the port Render will use
EXPOSE 10000

# CMD using JSON format for Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:$PORT", "backend.app:create_app()"]