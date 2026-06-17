const express = require("express");
const mysql = require("mysql2/promise");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 28286,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createTableIfNotExist() {
  const tableQuery = `
        CREATE TABLE IF NOT EXISTS github_profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(100),
            bio TEXT,
            public_repos INT DEFAULT 0,
            followers INT DEFAULT 0,
            following INT DEFAULT 0,
            top_languages VARCHAR(255),
            avg_stars_per_repo DECIMAL(5,2) DEFAULT 0.00,
            profile_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `;
  try {
    await pool.query(tableQuery);
    console.log("Database Table Verified / Created Successfully!");
  } catch (err) {
    console.error("Table creation error:", err.message);
  }
}
createTableIfNotExist();

app.get("/", (req, res) => {
  res.redirect("/api/profiles");
});

// 1. POST: Analyze GitHub Profile & Store/Update
app.post("/api/analyze/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const userResponse = await axios.get(
      `https://api.github.com/users/${username}`,
    );
    const userData = userResponse.data;

    const reposResponse = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100`,
    );
    const repos = reposResponse.data;

    let totalStars = 0;
    const languagesMap = {};

    repos.forEach((repo) => {
      totalStars += repo.stargazers_count;
      if (repo.language) {
        languagesMap[repo.language] = (languagesMap[repo.language] || 0) + 1;
      }
    });

    const avgStars = repos.length ? (totalStars / repos.length).toFixed(2) : 0;

    const topLanguages =
      Object.keys(languagesMap)
        .sort((a, b) => languagesMap[b] - languagesMap[a])
        .slice(0, 3)
        .join(", ") || "None";

    const query = `
            INSERT INTO github_profiles (username, name, bio, public_repos, followers, following, top_languages, avg_stars_per_repo, profile_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                name = VALUES(name),
                bio = VALUES(bio),
                public_repos = VALUES(public_repos),
                followers = VALUES(followers),
                following = VALUES(following),
                top_languages = VALUES(top_languages),
                avg_stars_per_repo = VALUES(avg_stars_per_repo),
                profile_url = VALUES(profile_url);
        `;

    const values = [
      userData.login,
      userData.name || "N/A",
      userData.bio || "N/A",
      userData.public_repos,
      userData.followers,
      userData.following,
      topLanguages,
      avgStars,
      userData.html_url,
    ];

    await pool.query(query, values);

    res.status(200).json({
      message: "Profile analyzed and saved successfully!",
      data: {
        username: userData.login,
        name: userData.name,
        public_repos: userData.public_repos,
        followers: userData.followers,
        top_languages: topLanguages,
        avg_stars_per_repo: avgStars,
      },
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: "GitHub user not found!" });
    }
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong while processing data." });
  }
});

app.get("/api/profiles", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, name, public_repos, followers, top_languages FROM github_profiles ORDER BY created_at DESC",
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/profiles/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM github_profiles WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message:
          "Profile not found in our database. Analyze it first using POST /api/analyze/:username",
      });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
