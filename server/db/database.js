const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dbDir, 'lucid_stem.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // 1. Settings Table
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        // Seed default admin settings if not present
        const defaultSettings = {
            booking_start_date: '', // Default: today
            booking_end_date: '',   // Default: empty (calculated from max_months_ahead)
            max_months_ahead: '3',
            available_weekdays: '1,2,3,4,5', // Monday to Friday (1-5)
            working_hours_start: '09:00',
            working_hours_end: '17:00',
            appointment_duration: '30', // minutes
            buffer_time: '15',          // minutes
            default_timezone: process.env.DEFAULT_TIMEZONE || 'Africa/Johannesburg'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            db.run(
                `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
                [key, value]
            );
        }

        // 2. Bookings Table
        db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                subject TEXT NOT NULL,
                notes TEXT,
                selected_date TEXT NOT NULL,
                start_time_utc TEXT NOT NULL,
                end_time_utc TEXT NOT NULL,
                timezone TEXT NOT NULL,
                google_event_id TEXT,
                google_meet_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Blocked Dates & Holidays Table
        db.run(`
            CREATE TABLE IF NOT EXISTS blocked_dates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                reason TEXT
            )
        `);
    });
}

// Database helper promises
const dbQuery = {
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },

    async getSettings() {
        const rows = await this.all(`SELECT key, value FROM settings`);
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        return settings;
    },

    async updateSettings(newSettings) {
        for (const [key, value] of Object.entries(newSettings)) {
            await this.run(
                `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
                [key, String(value), String(value)]
            );
        }
    }
};

module.exports = { db, dbQuery };
