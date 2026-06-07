FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils curl && \
    rm -rf /var/lib/apt/lists/*

# Install markitdown CLI globally so the binary is on PATH
RUN pip install --no-cache-dir markitdown[pdf]>=0.1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY main.py .

RUN mkdir -p /app/uploads /app/results /app/temp_images /app/data

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
