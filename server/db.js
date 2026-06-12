const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

const db = pool.promise();

// Create all tables
async function createTables() {
    // Users table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            password VARCHAR(255) NOT NULL,
            role ENUM('traveler', 'driver', 'guide') NOT NULL,
            traveler_id VARCHAR(100),
            traveler_id_type VARCHAR(50),
            driving_license VARCHAR(100),
            aadhar VARCHAR(100),
            age INT,
            emergency_contact VARCHAR(20),
            vehicle_type VARCHAR(50),
            vehicle_brand VARCHAR(100),
            vehicle_number VARCHAR(50),
            city VARCHAR(100),
            price_per_ride INT,
            rating DECIMAL(3,1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ride requests table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS ride_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            traveler_name VARCHAR(100),
            traveler_email VARCHAR(100),
            traveler_phone VARCHAR(20),
            driver_name VARCHAR(100),
            vehicle_type VARCHAR(50),
            vehicle VARCHAR(100),
            vehicle_number VARCHAR(50),
            city VARCHAR(100),
            pickup VARCHAR(200),
            drop_location VARCHAR(200),
            price INT,
            status ENUM('pending', 'accepted', 'declined', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Guide bookings table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS guide_bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            traveler_name VARCHAR(100),
            traveler_email VARCHAR(100),
            traveler_phone VARCHAR(20),
            guide_name VARCHAR(100),
            tour_type VARCHAR(200),
            booking_date DATE,
            days INT,
            price VARCHAR(50),
            status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Reviews table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reviewer_name VARCHAR(100),
            text TEXT,
            service VARCHAR(200),
            rating VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Emergency contacts table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(100),
            contact_name VARCHAR(100),
            phone VARCHAR(20),
            relationship VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Guide services table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS guide_services (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guide_email VARCHAR(100),
            service_name VARCHAR(200),
            city VARCHAR(100),
            service_type VARCHAR(100),
            description TEXT,
            price VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('All tables created successfully.');
}

module.exports = { db, createTables };
