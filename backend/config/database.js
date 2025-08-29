const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

const dbConfig = {
  host: '104.251.209.68',
  port: 35689,
  user: 'admin',
  password: 'Adr1an@',
  database: 'db_SamCast',
  charset: 'utf8mb4',
  timezone: '+00:00',
  ...(isProduction && {
    ssl: false,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  })
};

// Pool de conexões
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Função para testar conexão
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Conectado ao MySQL com sucesso! (${dbConfig.host}:${dbConfig.port})`);
    
    // Verificar se colunas necessárias existem na tabela videos
    try {
      await connection.execute(`
        ALTER TABLE videos 
        ADD COLUMN IF NOT EXISTS codec_video VARCHAR(50) DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS largura INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS altura INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS view_url VARCHAR(500) DEFAULT NULL
      `);
      console.log('✅ Colunas da tabela videos verificadas/criadas');
    } catch (alterError) {
      console.warn('⚠️ Aviso ao verificar colunas:', alterError.message);
    }
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MySQL:', {
      message: error.message,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  execute: (query, params) => pool.execute(query, params),
  query: (query, params) => pool.query(query, params)
};