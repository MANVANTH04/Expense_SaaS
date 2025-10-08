# Use official Python slim image
FROM python:3.11-slim

ENV FLASK_APP=app.py
ENV FLASK_ENV=development
# Set working directory
WORKDIR /app

# Install system dependencies needed for some Python packages
RUN apt-get update && apt-get install -y build-essential libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose the port your Flask app uses
EXPOSE 5000

# Run the Flask app using Gunicorn with your app factory
CMD ["gunicorn", "-b", "0.0.0.0:${PORT}", "app:create_app()"]