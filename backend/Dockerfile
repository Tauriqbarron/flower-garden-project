FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY ./database ./database

# Non-root user
RUN addgroup --gid 1001 --system appgroup && \
    adduser --uid 1001 --system --ingroup appgroup appuser

# Analytics data directory (writable by appuser)
RUN mkdir -p /app/data/analytics && chown appuser:appgroup /app/data/analytics
# Runtime data directory (requests, notifications — writable by appuser)
RUN mkdir -p /app/data/runtime && chown appuser:appgroup /app/data/runtime
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
