require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors middleware

// Create the Express app
const app = express();

// Enable CORS for all routes and origins (or specify allowed origins)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));
  

// Parse JSON request bodies
app.use(bodyParser.json());

// Environment Variables
const PORT = process.env.PORT || 5000;
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgres://postgres.hhfetohqcseicbspsbbi:qw123qew132rr254@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Database Connection menggunakan connection string
const db = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection dengan penanganan error yang lebih baik
db.connect((err, client, done) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        console.error('Connection details:', {
            connectionString: CONNECTION_STRING,
            ssl: true
        });
    } else {
        console.log('Connected to PostgreSQL database 🚀');
        if (done) done();
    }
});

// Middleware for authenticating JWT tokens
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token
    if (!token) return res.status(401).json({ error: 'Access denied, no token provided' });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Add user data to request object
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
}

// API Routes

// 1. Register
app.post('/auth/register', async (req, res) => {
    const { username, email, no_telp, password, umuribu, alamatlengkap } = req.body;

    try {
        // Cek apakah email sudah terdaftar
        const checkEmail = await db.query('SELECT * FROM "user" WHERE email = $1', [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        const sql = 'INSERT INTO "user" (username, email, no_telp, password, umuribu, alamatlengkap) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const result = await db.query(sql, [username, email, no_telp, hashedPassword, umuribu, alamatlengkap]);
        

        res.status(201).json({ 
            message: 'User registered successfully',
            user: {
                username: result.rows[0].username,
                email: result.rows[0].email,
                umuribu: result.rows[0].umuribu,
                alamatlengkap: result.rows[0].alamatlengkap
            }
        });

    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ 
            error: 'Error registering user', 
            details: err.message 
        });
    }
});

// 2. Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Cek email di database
        const sql = 'SELECT * FROM "user" WHERE email = $1';
        const result = await db.query(sql, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Create JWT Token
        const token = jwt.sign(
            { 
                username: user.username,
                email: user.email 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ 
            message: 'Login successful',
            token,
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ 
            error: 'Error logging in', 
            details: err.message 
        });
    }
});

// 3. Add Alat
// app.post('/alat/add-alat', authenticate, async (req, res) => {
//     const { nama_anak, usia, jeniskelamin, idalat, tanggalLahir, beratBadan, tinggiBadan, tanganKananLebar, tanganKananPanjang, kakiKananLebar, kakiKananPanjang, lebarLangkah } = req.body;
//     const username = req.user.username;

//     try {
//         // Cek apakah idalat sudah terdaftar
//         const checkAlat = await db.query('SELECT * FROM dataalat WHERE idalat = $1', [idalat]);
//         if (checkAlat.rows.length > 0) {
//             return res.status(400).json({ error: 'ID Alat already registered' });
//         }

//         // Gunakan double quotes untuk nama kolom yang menggunakan camelCase
//         const sql = `
//             INSERT INTO dataalat (
//                 username, 
//                 nama_anak, 
//                 usia, 
//                 jeniskelamin, 
//                 idalat, 
//                 tanggalLahir, 
//                 "beratBadan", 
//                 "tinggiBadan", 
//                 "tanganKananLebar", 
//                 "tanganKananPanjang", 
//                 "kakiKananLebar", 
//                 "kakiKananPanjang", 
//                 "lebarLangkah"
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;
            
//         const result = await db.query(sql, [
//             username, 
//             nama_anak, 
//             usia, 
//             jeniskelamin, 
//             idalat, 
//             tanggalLahir, 
//             beratBadan, 
//             tinggiBadan, 
//             tanganKananLebar, 
//             tanganKananPanjang, 
//             kakiKananLebar, 
//             kakiKananPanjang, 
//             lebarLangkah
//         ]);

//         res.status(201).json({ 
//             message: 'Alat added successfully',
//             data: result.rows[0]
//         });
//     } catch (err) {
//         console.error('Error adding alat:', err);
//         res.status(500).json({ 
//             error: 'Error adding alat', 
//             details: err.message 
//         });
//     }
// });

app.post('/alat/add-alat', authenticate, async (req, res) => {
    const { 
        nama_anak, 
        usia, 
        jeniskelamin, 
        idalat, 
        tanggalLahir, // pastikan nama field sesuai
        beratBadan, 
        tinggiBadan, 
        tanganKananLebar, 
        tanganKananPanjang, 
        kakiKananLebar, 
        kakiKananPanjang, 
        lebarLangkah 
    } = req.body;
    const username = req.user.username;

    try {
        // Validasi input
        if (!nama_anak || !usia || !jeniskelamin || !idalat || !tanggalLahir) {
            return res.status(400).json({ 
                error: 'Semua field wajib diisi',
                details: {
                    nama_anak: !nama_anak ? 'Nama anak harus diisi' : null,
                    usia: !usia ? 'Usia harus diisi' : null,
                    jeniskelamin: !jeniskelamin ? 'Jenis kelamin harus diisi' : null,
                    idalat: !idalat ? 'ID Alat harus diisi' : null,
                    tanggalLahir: !tanggalLahir ? 'Tanggal lahir harus diisi' : null
                }
            });
        }

        // Validasi format tanggal
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(tanggalLahir)) {
            return res.status(400).json({ 
                error: 'Format tanggal lahir tidak valid. Gunakan format YYYY-MM-DD' 
            });
        }

        // Konversi tanggal
        const formattedTanggalLahir = new Date(tanggalLahir);
        if (isNaN(formattedTanggalLahir.getTime())) {
            return res.status(400).json({ 
                error: 'Tanggal lahir tidak valid' 
            });
        }

        // Cek ID Alat
        const checkAlat = await db.query('SELECT * FROM dataalat WHERE idalat = $1', [idalat]);
        if (checkAlat.rows.length > 0) {
            return res.status(400).json({ 
                error: 'ID Alat sudah terdaftar' 
            });
        }

        const sql = `
            INSERT INTO dataalat (
                username, 
                nama_anak, 
                usia, 
                jeniskelamin, 
                idalat, 
                "tanggalLahir", 
                "beratBadan", 
                "tinggiBadan", 
                "tanganKananLebar", 
                "tanganKananPanjang", 
                "kakiKananLebar", 
                "kakiKananPanjang", 
                "lebarLangkah",
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP) 
            RETURNING *`;
            
        const result = await db.query(sql, [
            username, 
            nama_anak, 
            usia, 
            jeniskelamin, 
            idalat, 
            formattedTanggalLahir.toISOString(), 
            beratBadan || 0, 
            tinggiBadan || 0, 
            tanganKananLebar || 0, 
            tanganKananPanjang || 0, 
            kakiKananLebar || 0, 
            kakiKananPanjang || 0, 
            lebarLangkah || 0
        ]);

        res.status(201).json({ 
            status: 'success',
            message: 'Data anak berhasil ditambahkan',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error adding alat:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Gagal menambahkan data anak',
            error: err.message 
        });
    }
});

// 4. List Alat
app.get('/alat/list-alat', authenticate, async (req, res) => {
    const username = req.user.username;

    try {
        const sql = 'SELECT * FROM dataalat WHERE username = $1 ORDER BY nama_anak ASC';
        const result = await db.query(sql, [username]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No alat found for this user' });
        }

        res.json({ 
            message: 'Data retrieved successfully',
            alat: result.rows 
        });
    } catch (err) {
        console.error('Error fetching alat:', err);
        res.status(500).json({ 
            error: 'Error fetching alat', 
            details: err.message 
        });
    }
});

// Endpoint to get the latest data for a specific alat by idalat
app.get('/monitoring/latest/:idalat', async (req, res) => {
    const { idalat } = req.params;

    try {
        // Fetch the latest monitoring data for the specified idalat
        const sql = 'SELECT * FROM monitoring WHERE idalat = $1 ORDER BY updated_at DESC LIMIT 1';
        const result = await db.query(sql, [idalat]);

        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'Alat belum dihidupkan' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('Error fetching latest monitoring data:', err);
        res.status(500).json({ error: 'Error fetching monitoring data', details: err.message });
    }
});

// API to save history when data remains unchanged for 10 seconds
app.post('/history/save', async (req, res) => {
    const { idalat, duration } = req.body;

    try {
        // Fetch the first updated_at for the specified idalat
        const sql = 'SELECT updated_at FROM monitoring WHERE idalat = $1 ORDER BY updated_at ASC LIMIT 1';
        const result = await db.query(sql, [idalat]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No data found for this alat' });
        }

        const createdAt = result.rows[0].updated_at;

        // Ubah timezone ke UTC+7
        const timezoneOffset = 7 * 60 * 60 * 1000; // 7 jam dalam milisecond
        const createdAtJakarta = new Date(createdAt.getTime() + timezoneOffset);

        // Save history data to the database
        const sqlInsert = 'INSERT INTO history (idalat, created_at, duration) VALUES ($1, $2, $3)';
        await db.query(sqlInsert, [idalat, createdAtJakarta, duration]);

        // Delete all data from monitoring table for the specified idalat
        const deleteSql = 'DELETE FROM monitoring WHERE idalat = $1';
        const deleteResult = await db.query(deleteSql, [idalat]);

        if (deleteResult.rowCount === 0) {
            console.error('Error deleting data from monitoring table:', 'No rows affected');
            return res.status(500).json({ error: 'Error deleting data from monitoring table', details: 'No rows affected' });
        }

        res.status(201).json({ message: 'History saved successfully' });
    } catch (err) {
        console.error('Error saving history:', err);
        res.status(500).json({ error: 'Error saving history', details: err.message });
    }
});

// Endpoint to fetch history for a specific alat by idalat
app.get('/history/:idalat', async (req, res) => {
    const { idalat } = req.params;

    try {
        const sql = `SELECT 
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
            duration 
            FROM history 
            WHERE idalat = $1 
            ORDER BY created_at ASC`;
        const result = await db.query(sql, [idalat]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No history found for this alat' });
        }

        res.status(200).json({ history: result.rows });
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Error fetching history', details: err.message });
    }
});

// Endpoint untuk menampilkan seluruh data user
app.get('/users', authenticate, async (req, res) => {
    try {
        const sql = 'SELECT username, email, no_telp, umuribu, alamatlengkap FROM "user"';
        const result = await db.query(sql);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tidak ada data pengguna' });
        }

        res.json({ 
            message: 'Data pengguna berhasil diambil',
            users: result.rows 
        });
    } catch (err) {
        console.error('Error mengambil data pengguna:', err);
        res.status(500).json({ 
            error: 'Error mengambil data pengguna', 
            details: err.message 
        });
    }
});

// Endpoint untuk mendapatkan detail user/ibu
app.get('/users/detail/:username', authenticate, async (req, res) => {
    const { username } = req.params;

    try {
        const sql = `
            SELECT 
                "user".username,
                "user".email,
                "user".umuribu,
                "user".alamatlengkap,
                "user".no_telp
            FROM "user" 
            WHERE "user".username = $1`;
            
        const result = await db.query(sql, [username]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Data user tidak ditemukan' 
            });
        }

        res.json({ 
            status: 'success',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error mengambil detail user:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Error mengambil detail user',
            details: err.message
        });
    }
});

// Endpoint untuk mendapatkan detail data anak
app.get('/alat/detail/:username/:nama_anak', authenticate, async (req, res) => {
    const { username, nama_anak } = req.params;

    try {
        const sql = `
            SELECT 
                nama_anak,
                jeniskelamin,
                TO_CHAR("tanggalLahir", 'DD-MM-YYYY') as "tanggalLahir",
                usia,
                "beratBadan",
                "tinggiBadan",
                "tanganKananLebar",
                "tanganKananPanjang",
                "kakiKananLebar",
                "kakiKananPanjang",
                "lebarLangkah"
            FROM dataalat 
            WHERE username = $1 AND LOWER(nama_anak) = LOWER($2)
            ORDER BY created_at DESC
            LIMIT 1`;
            
        const result = await db.query(sql, [username, nama_anak]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                status: 'error',
                message: 'Data anak tidak ditemukan' 
            });
        }

        res.json({ 
            status: 'success',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error mengambil detail anak:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Error mengambil detail anak',
            error: err.message
        });
    }
});

// Start the Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} 🖥️`);
});


