require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
});

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const schemaPath = path.resolve(__dirname, "..", "..", "sql", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  try {
    await connection.query(schemaSql);
    console.log("reset-database-ok");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
