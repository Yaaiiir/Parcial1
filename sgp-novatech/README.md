# SGP-NovaTech

Sistema web de gestion de proyectos para NovaTech Consulting.

## Requisitos

- Node.js 20+
- npm 10+

## Estructura

- `backend/`: API REST con Express, Prisma y SQLite
- `frontend/`: SPA en Angular

## Inicio rapido

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

La API queda disponible en `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run start
```

La app queda disponible en `http://localhost:4200`.

## Scripts utiles

### Backend

- `npm run dev`: inicia el servidor en desarrollo
- `npm run build`: compila TypeScript
- `npm run test`: ejecuta pruebas
- `npm run test:cov`: genera cobertura

### Frontend

- `npm run start`: inicia Angular en desarrollo
- `npm run build`: compila la aplicacion

## Base de datos

El proyecto usa SQLite en desarrollo. Si agregas cambios al esquema:

```bash
cd backend
npx prisma generate
```

Si necesitas actualizar una base local existente, aplica las migraciones correspondientes antes de iniciar el servidor.

## Documentacion de prueba

- `docs/cuentas-demo-y-flujos.md`: cuentas demo, proyectos cargados y recorridos sugeridos para probar el sistema
- `docs/matriz-seguimiento-entregables.md`: matriz consolidada de avance y entregables
- `docs/Dia12_EvaluacionSUS/guia-sus-y-resultados.md`: plantilla y guia para ejecutar SUS
- `docs/Dia13_DespliegueUAT/guia-despliegue-y-uat.md`: guia de despliegue y checklist UAT
- `docs/Dia14_MetricasYDocumentacion/informe-metricas-final.md`: resumen tecnico y metricas actuales
- `docs/Dia15_PresentacionFinal/guion-presentacion-y-demo.md`: guion sugerido para la exposicion final
