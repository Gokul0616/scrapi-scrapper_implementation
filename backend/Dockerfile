FROM mcr.microsoft.com/playwright/python:v1.45.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefer-binary --default-timeout=100 -r requirements.txt

COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
