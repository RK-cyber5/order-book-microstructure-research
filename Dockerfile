FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml .
COPY research_api/requirements.txt ./research_api/
RUN pip install --no-cache-dir -r research_api/requirements.txt uvicorn python-multipart

# Copy authoritative results data
COPY results/ /app/results/

# Copy API source
COPY research_api/ /app/research_api/

# Start server using the PORT environment variable (Render default)
CMD sh -c "uvicorn research_api.main:app --host 0.0.0.0 --port ${PORT:-10000}"
