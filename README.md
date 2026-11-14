## Setup and Running the Application

### Prerequisites
- Node.js
- npm
- PostgreSQL

### 1. Database configuration

Create a PostgreSQL database named `liquidity_forecasting`.

### 2. Backend setup

```bash
cd backend
npm install
```

Create a local `.env` file using `.env.example` as a reference. Configure your PostgreSQL `DATABASE_URL`.

Apply migrations and generate Prisma Client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend setup

Open a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend requires the backend API to be running.

### 4. Synthetic data generation

The baseline generator configuration is available at:

`data-generator/config/generator.config.js`

The configured seed is `20261022`.

Run the generator only against a clean, separately prepared database:

```bash
node data-generator/generate.js
```

Do not use `--reset` against an existing database containing project data.

### 5. Verification

From the `backend/` directory:

```bash
npm test
npx prisma validate
node scripts/verify-actuals.js
node scripts/run-evaluation.js
node scripts/summarize-evaluation-by-currency.js
node scripts/validate-anomaly-fixtures.js
```

### 6. Frontend checks

From the `frontend/` directory:

```bash
npm run lint
npm run build
```

## Reproducibility Note

The generator uses a fixed seed and configurable dataset volumes. Two independent full regenerations with matching row counts and checksums have not been verified for this submission.