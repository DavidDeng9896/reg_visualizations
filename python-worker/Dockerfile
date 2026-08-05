FROM python:3.11-slim

WORKDIR /app

# rdkit is installed via conda-forge in production images; for slim builds use pip wheels when available.
# Uncomment or use requirements-docker.txt when a compatible rdkit wheel is pinned for your platform.
# RUN pip install rdkit-pypi

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8091

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8091"]
