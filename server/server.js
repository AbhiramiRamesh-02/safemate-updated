const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
require('dotenv').config();

const { db, createTables } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// ─── MIDDLEWARE: Verify JWT Token ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}


// ═══════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════

// POST /api/signup
app.post('/api/signup', async (req, res) => {
    try {
        const {
            name, email, phone, password, role,
            traveler_id, traveler_id_type,
            driving_license, aadhar, age, emergency_contact
        } = req.body;

        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({ error: 'Please fill in all fields' });
        }

        // Check if email already exists
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            `INSERT INTO users (name, email, phone, password, role, traveler_id, traveler_id_type, driving_license, aadhar, age, emergency_contact)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, hashedPassword, role, traveler_id || null, traveler_id_type || null,
             driving_license || null, aadhar || null, age || null, emergency_contact || null]
        );

        const token = jwt.sign({ email, name, role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { name, email, role } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please enter email and password' });
        }

        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// ═══════════════════════════════════════════════════════
//  USER ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/me — get current user profile
app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, phone, role, vehicle_type, vehicle_brand, vehicle_number, city, price_per_ride, emergency_contact FROM users WHERE email = ?',
            [req.user.email]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// PUT /api/vehicle — save driver vehicle details
app.put('/api/vehicle', authMiddleware, async (req, res) => {
    try {
        const { vehicle_type, vehicle_brand, vehicle_number, city, price_per_ride } = req.body;

        await db.execute(
            'UPDATE users SET vehicle_type = ?, vehicle_brand = ?, vehicle_number = ?, city = ?, price_per_ride = ? WHERE email = ?',
            [vehicle_type, vehicle_brand, vehicle_number, city, price_per_ride, req.user.email]
        );

        res.json({ message: 'Vehicle details saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// ═══════════════════════════════════════════════════════
//  DRIVERS ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/drivers — get all available drivers
app.get('/api/drivers', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT name, email, phone, vehicle_type, vehicle_brand, vehicle_number, city, price_per_ride, rating FROM users WHERE role = "driver" AND vehicle_number IS NOT NULL'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/rides — request a ride
app.post('/api/rides', authMiddleware, async (req, res) => {
    try {
        const { driver_name, vehicle_type, vehicle, vehicle_number, city, pickup, drop_location, price } = req.body;

        await db.execute(
            `INSERT INTO ride_requests (traveler_name, traveler_email, traveler_phone, driver_name, vehicle_type, vehicle, vehicle_number, city, pickup, drop_location, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.name, req.user.email, req.body.phone || '', driver_name, vehicle_type, vehicle, vehicle_number, city, pickup, drop_location, price]
        );

        res.json({ message: 'Ride request sent successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/rides/pending — get pending ride requests (for driver)
app.get('/api/rides/pending', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM ride_requests WHERE status = "pending" ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/rides/my — get my completed/accepted rides (for driver)
app.get('/api/rides/my', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM ride_requests WHERE status IN ("accepted", "completed") ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// PUT /api/rides/:id/accept
app.put('/api/rides/:id/accept', authMiddleware, async (req, res) => {
    try {
        await db.execute('UPDATE ride_requests SET status = "accepted" WHERE id = ?', [req.params.id]);
        const [rows] = await db.execute('SELECT * FROM ride_requests WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ride accepted', ride: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// PUT /api/rides/:id/decline
app.put('/api/rides/:id/decline', authMiddleware, async (req, res) => {
    try {
        await db.execute('UPDATE ride_requests SET status = "declined" WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ride declined' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// PUT /api/rides/:id/complete
app.put('/api/rides/:id/complete', authMiddleware, async (req, res) => {
    try {
        await db.execute('UPDATE ride_requests SET status = "completed" WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ride completed' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/driver/stats — get driver earnings and stats
app.get('/api/driver/stats', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const [allRides] = await db.execute(
            'SELECT * FROM ride_requests WHERE status IN ("accepted", "completed")'
        );

        const [todayRides] = await db.execute(
            'SELECT * FROM ride_requests WHERE status IN ("accepted", "completed") AND DATE(created_at) = ?',
            [today]
        );

        const [userRows] = await db.execute('SELECT rating FROM users WHERE email = ?', [req.user.email]);

        const totalEarnings = allRides.reduce((sum, r) => sum + (r.price || 0), 0);
        const todayEarnings = todayRides.reduce((sum, r) => sum + (r.price || 0), 0);
        const rating = userRows[0]?.rating || 0;

        res.json({
            total_rides: allRides.length,
            today_rides: todayRides.length,
            total_earnings: totalEarnings,
            today_earnings: todayEarnings,
            rating: rating
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// ═══════════════════════════════════════════════════════
//  GUIDES ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/guides — get all available guides
app.get('/api/guides', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT name, email, phone, city, rating, age FROM users WHERE role = "guide"'
        );

        // Also get their services
        const [services] = await db.execute('SELECT * FROM guide_services');

        const guides = rows.map(guide => {
            guide.services = services.filter(s => s.guide_email === guide.email);
            return guide;
        });

        res.json(guides);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/guide-services — add a guide service
app.post('/api/guide-services', authMiddleware, async (req, res) => {
    try {
        const { service_name, city, service_type, description, price } = req.body;

        await db.execute(
            'INSERT INTO guide_services (guide_email, service_name, city, service_type, description, price) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.email, service_name, city, service_type, description, price]
        );

        res.json({ message: 'Service added successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/guide-services/my — get current guide's services
app.get('/api/guide-services/my', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM guide_services WHERE guide_email = ?',
            [req.user.email]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/bookings — book a guide
app.post('/api/bookings', authMiddleware, async (req, res) => {
    try {
        const { guide_name, tour_type, booking_date, days, price } = req.body;

        await db.execute(
            `INSERT INTO guide_bookings (traveler_name, traveler_email, traveler_phone, guide_name, tour_type, booking_date, days, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.name, req.user.email, req.body.phone || '', guide_name, tour_type, booking_date, days, price]
        );

        res.json({ message: 'Booking confirmed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/bookings/pending — get pending booking requests (for guide)
app.get('/api/bookings/pending', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM guide_bookings WHERE status = "pending" ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/bookings/my — get accepted bookings (for guide)
app.get('/api/bookings/my', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM guide_bookings WHERE status = "accepted" ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// GET /api/bookings/traveler — get bookings made by a traveler
app.get('/api/bookings/traveler', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM guide_bookings WHERE traveler_email = ? ORDER BY created_at DESC',
            [req.user.email]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// PUT /api/bookings/:id/accept
app.put('/api/bookings/:id/accept', authMiddleware, async (req, res) => {
    try {
        await db.execute('UPDATE guide_bookings SET status = "accepted" WHERE id = ?', [req.params.id]);
        const [rows] = await db.execute('SELECT * FROM guide_bookings WHERE id = ?', [req.params.id]);
        res.json({ message: 'Booking accepted', booking: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// PUT /api/bookings/:id/decline
app.put('/api/bookings/:id/decline', authMiddleware, async (req, res) => {
    try {
        await db.execute('UPDATE guide_bookings SET status = "declined" WHERE id = ?', [req.params.id]);
        res.json({ message: 'Booking declined' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// ═══════════════════════════════════════════════════════
//  REVIEWS ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM reviews ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/reviews
app.post('/api/reviews', authMiddleware, async (req, res) => {
    try {
        const { text, service, rating } = req.body;

        if (!text || !rating) {
            return res.status(400).json({ error: 'Please fill in all fields' });
        }

        await db.execute(
            'INSERT INTO reviews (reviewer_name, text, service, rating) VALUES (?, ?, ?, ?)',
            [req.user.name, text, service, rating]
        );

        res.json({ message: 'Review submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// ═══════════════════════════════════════════════════════
//  EMERGENCY CONTACTS ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/emergency-contacts
app.get('/api/emergency-contacts', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM emergency_contacts WHERE user_email = ?',
            [req.user.email]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// POST /api/emergency-contacts
app.post('/api/emergency-contacts', authMiddleware, async (req, res) => {
    try {
        const { contact_name, phone, relationship } = req.body;

        if (!contact_name || !phone) {
            return res.status(400).json({ error: 'Please fill in all fields' });
        }

        await db.execute(
            'INSERT INTO emergency_contacts (user_email, contact_name, phone, relationship) VALUES (?, ?, ?, ?)',
            [req.user.email, contact_name, phone, relationship]
        );

        res.json({ message: 'Emergency contact saved' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// ═══════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════

async function startServer() {
    try {
        // First create database if it doesn't exist
        const tempConn = mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        tempConn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`, (err) => {
            if (err) {
                console.error('Could not create database:', err.message);
                process.exit(1);
            }
            tempConn.end();
        });

        // Wait a moment then create tables
        await new Promise(resolve => setTimeout(resolve, 500));
        await createTables();

        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            console.log(`Safemate server running on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

startServer();
