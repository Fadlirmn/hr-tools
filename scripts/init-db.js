const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
} catch (e) {
  // dotenv mungkin tidak terinstal di standalone runner — fine, env dari Docker.
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL is not set in .env.local or .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString })

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function init() {
  const maxRetries = 10
  let client
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`Connecting to database (attempt ${i}/${maxRetries})...`)
      client = await pool.connect()
      break
    } catch (err) {
      if (i === maxRetries) {
        console.error('Failed to connect to database. Exiting.')
        process.exit(1)
      }
      console.log('Database not ready yet. Retrying in 3 seconds...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  try {
    console.log('Running schema.sql...')
    const schemaPath = path.join(__dirname, '..', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    await client.query(schema)
    console.log('Schema applied successfully!')

    // Seed akun HR default pertama jika tabel users masih kosong.
    const userCountRes = await client.query('SELECT COUNT(*) FROM users')
    const count = parseInt(userCountRes.rows[0].count, 10)

    if (count === 0) {
      const defaultEmail = process.env.DEFAULT_USER_EMAIL
      const defaultPassword = process.env.DEFAULT_USER_PASSWORD
      const defaultName = process.env.DEFAULT_USER_NAME || 'HR Admin'

      if (!defaultEmail || !defaultPassword) {
        console.log('[INIT] DEFAULT_USER_EMAIL atau DEFAULT_USER_PASSWORD tidak di-set. Lewati pembuatan akun default.')
      } else {
        const passwordHash = hashPassword(defaultPassword)
        await client.query(
          "INSERT INTO users (email, password_hash, role, nama) VALUES ($1, $2, 'hr', $3)",
          [defaultEmail.toLowerCase().trim(), passwordHash, defaultName]
        )
        console.log(`[INIT] Akun HR default dibuat: ${defaultEmail}`)
      }
    } else {
      console.log('[INIT] Tabel users sudah terisi, lewati seeding akun HR default.')
    }

    // Akun dev/admin — selalu dicek terlepas dari isi tabel (idempotent by
    // email, bukan by count), supaya tetap dibuat walau akun HR di atas
    // sudah ada dari sebelumnya. Role 'dev' = akses penuh termasuk
    // /hr/users (manajemen semua akun).
    const devEmail = process.env.DEV_USER_EMAIL
    const devPassword = process.env.DEV_USER_PASSWORD
    const devName = process.env.DEV_USER_NAME || 'Developer'

    if (!devEmail || !devPassword) {
      console.log('[INIT] DEV_USER_EMAIL atau DEV_USER_PASSWORD tidak di-set. Lewati pembuatan akun dev.')
    } else {
      const cleanDevEmail = devEmail.toLowerCase().trim()
      const existingDev = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [cleanDevEmail])
      if (existingDev.rowCount === 0) {
        const passwordHash = hashPassword(devPassword)
        await client.query(
          "INSERT INTO users (email, password_hash, role, nama) VALUES ($1, $2, 'dev', $3)",
          [cleanDevEmail, passwordHash, devName]
        )
        console.log(`[INIT] Akun dev dibuat: ${cleanDevEmail}`)
      } else {
        console.log('[INIT] Akun dev sudah ada, lewati.')
      }
    }
  } catch (err) {
    console.error('Error applying schema:', err)
  } finally {
    if (client) client.release()
    await pool.end()
  }
}

init()
