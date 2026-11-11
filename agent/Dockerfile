FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --default-timeout=120 --retries 5 --no-cache-dir -r requirements.txt

COPY . .

# Pre-download required plugin model files during build
RUN python -m livekit.agents download-files

CMD ["python", "agent.py", "dev"]
