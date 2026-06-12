# Safemate 🛡️

Safemate is a travel safety platform built specifically for women. The idea came from a simple problem — women travelling alone often face safety concerns that don't get addressed by regular travel apps. So this tries to fix that.

---

## What it does

The app has three types of users — **Travelers**, **Drivers**, and **Travel Guides**. Each gets their own dashboard with features that actually matter to them.

**For Travelers:**
- Plan trips to destinations like Jaipur, Pondicherry, Coorg etc.
- Book a cab with verified women drivers only
- Find travel partners for group trips
- Book lady travel guides
- Find nearby clean toilets (seriously useful when you're in an unfamiliar city)
- Save emergency contacts and trigger SOS alerts instantly

**For Drivers:**
- See incoming ride requests
- Accept or decline rides
- Track today's earnings and total rides
- Save vehicle details

**For Travel Guides:**
- Add tour services
- Accept or decline booking requests from travelers
- View past bookings and reviews

---

## Tech Stack

Frontend is plain HTML, CSS and JavaScript — nothing fancy, just gets the job done.

Backend is Node.js with Express. Data is stored in MySQL. Passwords are hashed using bcrypt and auth is handled with JWT tokens.

---

## How to run it locally

You'll need Node.js and MySQL installed on your machine.

**1. Clone the repo**
```
git clone https://github.com/AbhiramiRamesh-02/safemate-updated.git
cd safemate-updated
```

**2. Set up the database config**

Go into the `server` folder and create a `.env` file:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=safemate
JWT_SECRET=safemate_secret_key_2024
PORT=3001
```

**3. Install dependencies and start the server**
```
cd server
npm install
node server.js
```

The server will automatically create the `safemate` database and all the tables on first run. You'll see this in the terminal:
```
All tables created successfully.
Safemate server running on http://localhost:3001
```

**4. Open the app**

Just open `index.html` in your browser. That's it.

---

## API Routes

Here's a quick reference for all the backend routes:

| Method | Route | What it does |
|--------|-------|-------------|
| POST | /api/signup | Register a new user |
| POST | /api/login | Login and get token |
| GET | /api/me | Get your profile |
| GET | /api/drivers | List available drivers |
| POST | /api/rides | Request a ride |
| GET | /api/rides/pending | Get pending ride requests |
| PUT | /api/rides/:id/accept | Accept a ride |
| PUT | /api/rides/:id/decline | Decline a ride |
| PUT | /api/rides/:id/complete | Complete a ride |
| GET | /api/driver/stats | Driver earnings stats |
| GET | /api/guides | List available guides |
| POST | /api/bookings | Book a guide |
| GET | /api/bookings/pending | Pending booking requests |
| PUT | /api/bookings/:id/accept | Accept a booking |
| PUT | /api/bookings/:id/decline | Decline a booking |
| POST | /api/guide-services | Add a guide service |
| GET | /api/reviews | Get all reviews |
| POST | /api/reviews | Submit a review |
| GET | /api/emergency-contacts | Get emergency contacts |
| POST | /api/emergency-contacts | Save emergency contact |

---

## Project Structure

```
safemate/
├── index.html          # The entire frontend (HTML + CSS + JS)
├── .gitignore
├── README.md
└── server/
    ├── server.js       # All backend routes
    ├── db.js           # MySQL connection and table setup
    ├── package.json
    └── .env            # Your config (not uploaded to GitHub)
```

---

## Notes

- The `.env` file is not pushed to GitHub for security reasons. You'll need to create your own.
- The database and tables are created automatically — you don't need to run any SQL manually.
- The app currently supports cities: Bangalore, Chennai, Jaipur, Pondicherry, Coorg, Delhi, Mumbai, Hyderabad.

---

Made by Abhirami Ramesh
