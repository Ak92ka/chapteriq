import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import crypto from "crypto"; // for hashing chapter text
import fs from "fs";
// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
import pkg from "pdfjs-dist/legacy/build/pdf.js"; 
const { getDocument } = pkg;
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });





dotenv.config();

const app = express();
// const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// // In-memory storage for daily usage
// const dailyUsage = {}; // { userId: timestampOfLastRequest }

// const cache = {}; // { chapterHash: aiOutput }

// Simple hash function for chapter text
function hashFunction(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

app.post("/api/generate-notes", async (req, res) => {
  const { text, userId } = req.body;

   // Backend validation
if (!text || text.trim().length === 0) {
  console.log("Rejected empty input"); // <-- log
  return res.status(400).json({ error: "Input cannot be empty." });
}


// --- Backend validation: check max length ---
  const MAX_LENGTH = 50000; // 50k characters
  if (text.length > MAX_LENGTH) {
    return res.status(400).json({
      error: `Input exceeds maximum allowed length of ${MAX_LENGTH} characters.`,
    });
  }

  // --- Backend validation: check max length ---
  const MIN_LENGTH = 1000; // minimum characters for a chapter
  if (text.length < MIN_LENGTH) {
    return res.status(400).json({
      error: `Chapter is too short. Minimum length is ${MIN_LENGTH} characters.`
    })
  }


  // const chapterHash = hashFunction(text); // simple hash of text content

  // // Serve from cache if exists
  // if (cache[chapterHash]) {
  //   console.log("Serving from cache:", chapterHash);
  //   return res.json({ output: cache[chapterHash], cached: true });
  // }


  // // --- 1 request per day logic ---
  // const now = Date.now();
  // const oneDay = 24 * 60 * 60 * 1000;

  // if (userId && dailyUsage[userId]) {
  //   const lastRequest = dailyUsage[userId];
  //   if (now - lastRequest < oneDay) {
  //     return res.status(429).json({
  //       error: "You’ve reached your daily limit. Subscribe for $5/month to generate notes unlimitedly.",
  //     });
  //   }
  // }

  // // Record current request
  // if (userId) dailyUsage[userId] = now;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-4"
      messages: [
        {
          role: "system",
          content: `You are an AI study assistant.

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
- Avoid repeating the same information across sections; each section must add new value.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Get the AI message
    const notes = response.choices[0].message.content;

    // Store in cache
  // cache[chapterHash] = notes;

    res.json({ output: notes, cached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ output: "Error generating notes" });
  }
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

export default app;
