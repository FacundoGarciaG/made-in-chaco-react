import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/made_in_chaco",
  max: 10,
});

export default pool;
