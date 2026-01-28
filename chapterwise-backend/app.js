import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs";
import pkg from "pdfjs-dist/legacy/build/pdf.js";
const { getDocument } = pkg;
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });
import signupHandler from "./auth/signup.js";
import loginHandler from "./auth/login.js";
import db from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function resetUsage(user) {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM

  if (user.dailyReset !== today) {
    user.dailyCharacters = 0;
    user.dailyReset = today;
  }

  if (user.monthlyReset !== thisMonth) {
    user.monthlyCharacters = 0;
    user.monthlyReset = thisMonth;
  }
}


function isSubscriptionActive(user) {
  if (!user.subscribed) return false;
  if (!user.subscribedUntil) return false;

  const now = new Date();
  const until = new Date(user.subscribedUntil);

  return until > now;
}

app.post("/api/generate-notes", async (req, res) => {
  try {
    const { text, userId } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Input cannot be empty." });
    }

    const textLen = text.length;

    if (userId) {
      // Get user from SQLite
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

      if (!user) {
        return res.status(401).json({ error: "User not found." });
      }

      // Reset usage
      resetUsage(user);

      // AUTO EXPIRE CHECK
      if (!isSubscriptionActive(user)) {
        db.prepare(`
          UPDATE users
          SET subscribed = 0
          WHERE id = ?
        `).run(userId);

        user.subscribed = 0; // update in memory too
      }

      // Limits
      const freeDailyLimit = 1000;
      const freeMonthlyLimit = 30000;
      const subMonthlyLimit = 50000;

      if (!isSubscriptionActive(user)) {
        if (user.dailyCharacters + textLen > freeDailyLimit) {
          return res.status(429).json({ error: "Daily limit reached." });
        }
        if (user.monthlyCharacters + textLen > freeMonthlyLimit) {
          return res.status(429).json({ error: "Monthly limit reached." });
        }
      } else {
        if (user.monthlyCharacters + textLen > subMonthlyLimit) {
          return res.status(429).json({ error: "Monthly limit reached. Please contact us." });
        }
      }

      // Update usage in memory
      user.dailyCharacters += textLen;
      user.monthlyCharacters += textLen;

      // Save usage to SQLite
      db.prepare(`
        UPDATE users
        SET dailyCharacters = ?, monthlyCharacters = ?, dailyReset = ?, monthlyReset = ?
        WHERE id = ?
      `).run(
        user.dailyCharacters,
        user.monthlyCharacters,
        user.dailyReset,
        user.monthlyReset,
        userId
      );
    }

  // ----------------- OpenAI call -----------------
    const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: [
        { role: "system", content: `You are an AI study assistant.

The user is an undergraduate student. 
The input is a textbook chapter.

Your task is to generate exam-ready study notes strictly following the structure and constraints below.
Failure to follow the structure exactly is an error.


GLOBAL FORMATTING RULE:
- Use - hyphens ONLY for all bullets.
- Do NOT use *, •, or numbered lists.


Output format (DO NOT CHANGE OR REORDER SECTIONS):

Chapter Name:
- Write the full chapter title exactly as provided.
- If the textbook chapter does not provide a title, make one up that clearly summarizes the chapter content.


Overview:
- 2–3 sentences explaining the main idea of the chapter in clear, simple language.
- If the main idea can be expressed in one long sentence, split it into multiple sentences for clarity.


Chapter Summary:
- 1 paragraph (4–6 sentences) summarizing the main events, examples, findings, and conclusions of the chapter.
- This should provide a concise narrative of the chapter while including the key information needed for understanding and revision.


Key Concepts:
- Include AT LEAST 3, up to 5 key concepts.
- Each bullet: Concept name + brief explanation (1–2 sentences).
- Key concepts should focus on ideas, mechanisms, frameworks, or relationships, not formal term definitions.


Important Definitions:
- Include AT LEAST 2, up to 5 definitions.
- Each bullet: Term + concise, exam-ready definition.
- Definitions must NOT repeat terms already explained in Key Concepts unless absolutely necessary; prioritize distinct examinable terminology.


Exam Focus:
- Imagine you are a university professor creating exam questions for undergraduate students based on this chapter.
- Create 4–8 concise Q&A pairs that cover the most important examinable concepts from the chapter.
- Format each Q&A pair like this (no hyphen at start):
Q1: [exam-style question]
A: [clear, direct answer in 2–3 sentences]

- Focus on clarity and conciseness rather than quoting directly from the text.
- Include a mix of “define,” “explain,” “compare,” and “discuss” type questions.
- Leave one empty line between each Q&A pair for readability.


- Tone and constraints:
- Write in simple, clear language suitable for undergraduate students.
- Keep sentences short and concise.
- Focus only on the most important examinable points.
- Do NOT add explanations outside the sections above.
- Do NOT add extra sections.
- Do NOT exceed the specified number of bullets in any section.
- Do NOT include opinions, commentary, or meta explanations.
- Avoid repeating the same information across sections; each section must add new value.`, },
        { role: "user", content: text }
  ],
});

const notes = response.output_text ?? "No output generated.";

    res.json({ output: notes, cached: false });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/grant-subscription", (req, res) => {
  const { userId } = req.body;
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30*24*60*60*1000);

  db.prepare(`
    UPDATE users
    SET subscribed = 1, subscribedAt = ?, subscribedUntil = ?
    WHERE id = ?
  `).run(now.toISOString(), thirtyDaysLater.toISOString(), userId);

  res.json({ message: "Subscription granted for 30 days" });
});


app.get("/api/me/:userId", (req, res) => {
  const user = db
    .prepare(`
      SELECT id, name, email, subscribed, subscribedAt, subscribedUntil
      FROM users
      WHERE id = ?
    `)
    .get(req.params.userId);

  if (!user) return res.status(404).json({ error: "User not found" });

  // Ensure nulls are properly set
  user.subscribedAt = user.subscribedAt || null;
  user.subscribedUntil = user.subscribedUntil || null;

  res.json(user);
});



// ----------------- PDF Extraction Endpoint -----------------

app.post("/api/extract-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const startPage = parseInt(req.body.startPage || "1", 10);
    const endPage = parseInt(req.body.endPage || "9999", 10);

    // ✅ CORRECT: use buffer directly
    const data = new Uint8Array(req.file.buffer);

    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    const from = Math.max(1, startPage);
    const to = Math.min(pdf.numPages, endPage);

    if (from > to) {
      return res.status(400).json({ error: "Invalid page range" });
    }

    let extractedText = "";

    for (let i = from; i <= to; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ");
      extractedText += pageText + "\n\n";
    }

    res.json({
      pages: `${from}-${to}`,
      text: extractedText,
    });

  } catch (err) {
    console.error("PDF extraction error:", err);
    res.status(500).json({ error: "Failed to extract text from PDF" });
  }
});

app.post("/auth/signup", signupHandler);
app.post("/auth/login", loginHandler);

export default app;
