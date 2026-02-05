import bcrypt from "bcrypt";
import db from "../db.js";

export default async function signupHandler(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long",
    });
  }

// Check if the user already exists
const { rows } = await db.query(
  "SELECT * FROM users WHERE email = $1",
  [email]
);
const existing = rows[0];

if (existing) {
  return res.status(409).json({ error: "Email already exists" });
}

// Hash the password
const hashed = await bcrypt.hash(password, 10);
const id = Date.now().toString(); // or use UUID for production

// Insert new user
await db.query(
  `INSERT INTO users (id, name, email, password, subscribed, subscribedAt, subscribedUntil)
   VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
  [id, name, email, hashed, false]
);

res.status(201).json({ message: "User created" });
}
