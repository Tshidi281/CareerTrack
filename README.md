# CareerTrack

CareerTrack is a youth employment and skills matching platform designed for South Africa. It connects job seekers, employers, and administrators in a single system where users can create profiles, search for jobs, apply for opportunities, publish vacancies, and receive recommendations based on skills and qualifications.

## Overview

This project is built with Node.js, Express, EJS, and MySQL. It is a MySQL-based application.

### Core features

- Job seeker registration and login
- Employer profile and dashboard
- Job posting and management
- Job search and filtering
- Skills-based job recommendations
- Applications tracking
- Admin management for categories and skills
- Notifications and user communications

## Tech stack

- Node.js
- Express.js
- EJS templates
- MySQL 8
- Express Session
- MySQL2 driver
- bcryptjs for password hashing

## Project structure

```text
CareerTrack/
├── careertrack/
│   ├── db/
│   │   ├── connection.js
│   │   ├── init.js
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── middleware/
│   ├── public/
│   ├── routes/
│   ├── services/
│   ├── views/
│   ├── .env
│   ├── package.json
│   ├── server.js
│   └── ...
├── README.md
└── package.json
```

## Prerequisites

Before running the app, make sure you have:

- Node.js 22 or later
- MySQL Server running locally or remotely
- A MySQL database created for the application

## Database setup

1. Open MySQL and create a database:

```sql
CREATE DATABASE careertrack;
```

2. Create a `.env` file inside the `careertrack` directory with your database configuration:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=careertrack
PORT=3000
```

3. Initialize the database schema:

```bash
npm run init
```

4. Seed the database with sample data:

```bash
npm run seed
```

> Note: This application uses MySQL. If SQLite settings are present elsewhere in older notes or documentation, they are outdated and should be ignored.

## Installation

From the project root or inside the `careertrack` folder, run:

```bash
npm install
```

## Run the application

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Default roles

The system supports:

- Admin
- Employer
- Job Seeker

## Notes

This project was originally migrated from a SQLite-based approach, but the application is now configured to use MySQL for persistent data storage. The runtime application, database connection, and schema scripts are all aligned to MySQL.

## License

This project is for academic and portfolio use unless otherwise specified by the owner.
