# GitHub Profile Analyzer API

A backend API built using **Node.js, Express.js, MySQL, and GitHub API** that fetches GitHub user data, generates useful insights, and stores them in a MySQL database.

## Live Demo

-🔗 [View Live Project](https://wanderlust-mern-six.vercel.app)
- **Automatic Redirect:** Accessing the root URL (`/`) will automatically redirect you to the profiles list (`/api/profiles`).

## Features

- Fetch GitHub profile details
- Store profile data in MySQL
- Find Top 3 Programming Languages
- Calculate Average Stars per Repository
- Update existing records automatically

## Tech Stack

- Node.js
- Express.js
- MySQL
- Axios

## Setup

```bash
npm install
node server.js
```

Create a `.env` file:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_analyzer
```

## API Endpoints

### Analyze Profile

```http
POST /api/analyze/:username
```

### Get All Profiles

```http
GET /api/profiles
```

### Get Profile By Username

```http
GET /api/profiles/:username
```

## Author

Mayank Gaur
