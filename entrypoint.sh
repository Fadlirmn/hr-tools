#!/bin/sh

# Jalankan inisialisasi database (akan mencoba ulang hingga DB siap)
node scripts/init-db.js

# Jalankan server utama Next.js
node server.js
