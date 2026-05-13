# =========================
# 1. Build frontend (Vite)
# =========================
FROM node:22-slim AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend .

RUN npm run build


# =========================
# 2. Backend (FastAPI)
# =========================
FROM python:3.11-slim

WORKDIR /app


RUN pip install uv


COPY backend/pyproject.toml backend/uv.lock ./


RUN uv sync --frozen


COPY backend /app


COPY --from=frontend-build /frontend/dist /app/frontend/dist

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]