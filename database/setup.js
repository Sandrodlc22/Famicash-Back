const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const baseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const targetDb = process.env.DB_NAME || 'famicash_db';

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de base de datos FamiCash en PostgreSQL...');
  console.log(`📡 Conectando a host: ${baseConfig.host}:${baseConfig.port} con usuario: ${baseConfig.user}`);

  // 1. Conectar a base de datos default 'postgres' para verificar/crear famicash_db
  const defaultClient = new Client({ ...baseConfig, database: 'postgres' });
  try {
    await defaultClient.connect();
    const checkDb = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );

    if (checkDb.rowCount === 0) {
      console.log(`🔨 Creando base de datos "${targetDb}"...`);
      await defaultClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✅ Base de datos "${targetDb}" creada.`);
    } else {
      console.log(`ℹ️ Base de datos "${targetDb}" ya existe.`);
    }
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL base:', err.message);
    console.log('Verifique que el servicio PostgreSQL esté activo y las credenciales en backend/.env sean correctas.');
    process.exit(1);
  } finally {
    await defaultClient.end();
  }

  // 2. Conectar a famicash_db y ejecutar schema.sql y seed.sql
  const dbClient = new Client({ ...baseConfig, database: targetDb });
  try {
    await dbClient.connect();
    console.log(`📂 Ejecutando schema.sql en "${targetDb}"...`);
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await dbClient.query(schemaSql);
    console.log('✅ Esquema y tablas creadas exitosamente.');

    console.log(`🌱 Insertando datos iniciales con seed.sql...`);
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await dbClient.query(seedSql);
    console.log('✅ Datos de prueba insertados con éxito.');

    console.log('🎉 ¡Base de datos PostgreSQL FamiCash configurada y lista!');
  } catch (err) {
    console.error('❌ Error al aplicar scripts en la base de datos:', err.message);
  } finally {
    await dbClient.end();
  }
}

setupDatabase();
