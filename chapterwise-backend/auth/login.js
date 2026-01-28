import bcrypt from "bcrypt";
import db from "../db.js";

export default async function loginHandler(req, res) {
  const { email, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.status(200).json({
  id: user.id,
  name: user.name,
  email: user.email,
  subscribed: user.subscribed,
  subscribedAt: user.subscribedAt,
  subscribedUntil: user.subscribedUntil,
    dailyCharacters: user.dailyCharacters,
    monthlyCharacters: user.monthlyCharacters,
  });
}
