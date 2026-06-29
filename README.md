# Mosaic Marketplace

Enterprise AI component marketplace with a Next.js frontend and FastAPI backend.

## Local Frontend

```bash
npm install
npm run dev
```

## Full Stack With Docker

```bash
cp .env.example .env
docker compose up --build
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8000/docs

## Backend Development

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```
