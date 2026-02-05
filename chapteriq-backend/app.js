import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import pkg from "pdfjs-dist/legacy/build/pdf.js";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });
import Stripe from "stripe";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { Pool } from "pg"; // PostgreSQL client

import signupHandler from "./auth/signup.js";
import loginHandler from "./auth/login.js";
import forgotPassword from "./auth/forgotPassword.js";
import resetPassword from "./auth/resetPassword.js";
import { authenticate } from "./middlewares/auth.js";
import cookieParser from "cookie-parser";
import logoutHandler from "./auth/logout.js";

const { getDocument } = pkg;
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
// ---------------- Stripe webhook ----------------
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log("⚠️ Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Checkout session completed:", session.id);
      console.log("Customer email:", session.customer_email);

      try {
        // Lookup user in Postgres
        const { rows } = await db.query(
          "SELECT * FROM users WHERE email = $1",
          [session.customer_email]
        );
        const user = rows[0];

        if (!user) {
          console.log("User not found for email:", session.customer_email);
          return res.json({ received: true });
        }

        const now = new Date();
        let subscriptionEnd = new Date();
        let interval = "month";
        let priceName = "Plus";
        let priceAmount = "$5";
        let billingInterval = "monthly";

        // Try fetching full subscription from Stripe
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription
            );
            if (subscription.items.data.length > 0) {
              const plan = subscription.items.data[0].plan;
              interval = plan.interval || "month";
              priceName = plan.nickname || "Plus";
              priceAmount = `$${plan.amount / 100}`;
              billingInterval = interval === "year" ? "yearly" : "monthly";

              if (interval === "year") {
                subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
              } else {
                subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
              }
            }
          } catch (err) {
            console.error("Failed to fetch subscription from Stripe:", err);
            subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
          }
        } else {
          subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
        }

        // Update user in Postgres
        await db.query(
          `UPDATE users
           SET subscribed = TRUE,
               subscribedAt = $1,
               subscribedUntil = $2,
               stripeSubscriptionId = $3,
               planName = $4,
               planPrice = $5,
               billingInterval = $6
           WHERE id = $7`,
          [
            now.toISOString(),
            subscriptionEnd.toISOString(),
            session.subscription || null,
            priceName,
            priceAmount + " / " + billingInterval,
            billingInterval,
            user.id
          ]
        );

        console.log(`Updated subscription for user ${user.id} until ${subscriptionEnd}`);
      } catch (err) {
        console.error("Failed to process webhook for user:", err);
      }
    }

    res.json({ received: true });
  }
);

// ---------------- PostgreSQL Connection ----------------
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requires this
});

async function testDBConnection() {
  try {
    await db.query("SELECT 1");
    console.log("✅ DB connection successful!");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
}

// Test connection immediately
testDBConnection();

// Helper to query a single row
async function querySingle(text, params) {
  const { rows } = await db.query(text, params);
  return rows[0];
}

// ---------------- CORS & Middleware ----------------
import cors from "cors";

const allowedOrigins = [
  "http://localhost:3000",
  "https://chapteriq.vercel.app",
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // ✅ allow cookies
}));

// app.use(cors({
//   // origin: process.env.FRONTEND_URL || "https://chapteriq.vercel.app" || "https://localhost3000.com",
//     origin: process.env.FRONTEND_URL,

//   credentials: true,
// }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// // ---------------- Stripe Webhook ----------------
// app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//     console.log("⚠️ Webhook signature verification failed.", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;
//     console.log("Checkout session completed:", session.id);
//     console.log("Customer email:", session.customer_email);

//     const user = await querySingle("SELECT * FROM users WHERE email = $1", [session.customer_email]);
//     if (!user) {
//       console.log("User not found for email:", session.customer_email);
//       return res.json({ received: true });
//     }

//     const now = new Date();
//     let subscriptionEnd = new Date();
//     let interval = "month";
//     let priceName = "Plus";
//     let priceAmount = "$5";
//     let billingInterval = "monthly";

//     if (session.subscription) {
//       try {
//         const subscription = await stripe.subscriptions.retrieve(session.subscription);
//         if (subscription.items.data.length > 0) {
//           const plan = subscription.items.data[0].plan;
//           interval = plan.interval || "month";
//           priceName = plan.nickname || "Plus";
//           priceAmount = `$${plan.amount / 100}`;
//           billingInterval = interval === "year" ? "yearly" : "monthly";

//           if (interval === "year") subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
//           else subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
//         }
//       } catch (err) {
//         console.error("Failed to fetch subscription from Stripe:", err);
//         subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
//       }
//     } else subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

//     // const upload = multer({ storage: multer.memoryStorage() });
//     // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

//     await db.query(`
//       UPDATE users
//       SET subscribed = TRUE,
//           subscribedAt = $1,
//           subscribedUntil = $2,
//           stripeSubscriptionId = $3,
//           planName = $4,
//           planPrice = $5,
//           billingInterval = $6
//       WHERE id = $7
//     `, [
//       now.toISOString(),
//       subscriptionEnd.toISOString(),
//       session.subscription || null,
//       priceName,
//       priceAmount + " / " + billingInterval,
//       billingInterval,
//       user.id
//     ]);

//     console.log(`Updated subscription for user ${user.id} until ${subscriptionEnd}`);
//   }

//   res.json({ received: true });
// });

// ---------------- Utility Functions ----------------
function resetUsage(user) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const thisMonth = now.toISOString().slice(0, 7);

  if (user.dailyReset !== today) user.dailyCharacters = 0, user.dailyReset = today;
  if (user.monthlyReset !== thisMonth) user.monthlyCharacters = 0, user.monthlyReset = thisMonth;
}

function isSubscriptionActive(user) {
  if (!user.subscribed || !user.subscribedUntil) return false;
  return new Date(user.subscribedUntil) > new Date();
}

// ---------------- API Endpoints ----------------
app.post("/api/generate-notes", async (req, res) => {
  try {
    const { text, userId } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ error: "Input cannot be empty." });

    let user;
    if (userId) {
      user = await querySingle("SELECT * FROM users WHERE id = $1", [userId]);
      if (!user) return res.status(401).json({ error: "User not found." });

      resetUsage(user);

      if (!isSubscriptionActive(user)) {
        await db.query("UPDATE users SET subscribed = FALSE WHERE id = $1", [userId]);
        user.subscribed = false;
      }

      // const freeDailyLimit = 1000;
      // const freeMonthlyLimit = 30000;
      const freeDailyLimit = 1000000; // dev
      const freeMonthlyLimit = 3000000; // dev
      const subMonthlyLimit = 50000;

      const textLen = text.length;
      if (!isSubscriptionActive(user)) {
        if (user.dailyCharacters + textLen > freeDailyLimit) return res.status(429).json({ error: "Daily limit reached." });
        if (user.monthlyCharacters + textLen > freeMonthlyLimit) return res.status(429).json({ error: "Monthly limit reached." });
      } else {
        if (user.monthlyCharacters + textLen > subMonthlyLimit) return res.status(429).json({ error: "Monthly limit reached." });
      }

      // Update usage in DB
      await db.query(`
        UPDATE users
        SET dailyCharacters = $1, monthlyCharacters = $2, dailyReset = $3, monthlyReset = $4
        WHERE id = $5
      `, [user.dailyCharacters + textLen, user.monthlyCharacters + textLen, user.dailyReset, user.monthlyReset, userId]);
    }

  // ----------------- OpenAI call -----------------
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
  model: "gpt-4.1-nano",
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

// Grant subscription
app.post("/api/grant-subscription", async (req, res) => {
  const { userId, planName = "Plus", planPrice = "$5 / month", billingInterval = "monthly" } = req.body;
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    const result = await db.query(
      `UPDATE users
       SET subscribed = TRUE,
           subscribedAt = $1,
           subscribedUntil = $2,
           planName = $3,
           planPrice = $4,
           billingInterval = $5
       WHERE id = $6
       RETURNING *`,
      [now.toISOString(), thirtyDaysLater.toISOString(), planName, planPrice, billingInterval, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: `Subscription granted for 30 days (${planName}, ${planPrice})` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to grant subscription" });
  }
});

// Get current user
app.get("/api/me", authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await db.query(
      `SELECT id, name, email, subscribed, subscribedAt, subscribedUntil, cancelAtPeriodEnd,
              planName, planPrice, billingInterval
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    // dates and booleans consistent
    user.subscribedAt = user.subscribedAt || null;
    user.subscribedUntil = user.subscribedUntil || null;
    user.cancelAtPeriodEnd = !!user.cancelAtPeriodEnd;
    user.planName = user.planName || null;
    user.planPrice = user.planPrice || null;
    user.billingInterval = user.billingInterval || null;

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
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


// ---------------- Auth / Stripe ----------------

app.post("/auth/signup", signupHandler);
app.post("/auth/login", loginHandler);

// Create Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  const { userId, priceId } = req.body;

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/account?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/account?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Cancel subscription
app.post("/api/cancel-subscription", async (req, res) => {
  const { userId } = req.body;

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.stripeSubscriptionId)
      return res.status(400).json({ error: "No active subscription found" });

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.query(
      `UPDATE users
       SET subscribed = TRUE,
           cancelAtPeriodEnd = $1
       WHERE id = $2`,
      [subscription.cancel_at_period_end, userId]
    );

    res.json({
      message: "Subscription will not renew after current period.",
      current_period_end: subscription.current_period_end,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Reactivate subscription
app.post("/api/reactivate-subscription", async (req, res) => {
  const { userId } = req.body;

  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.stripeSubscriptionId || !user.cancelAtPeriodEnd)
      return res.status(400).json({ error: "No canceled subscription to reactivate" });

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db.query(
      `UPDATE users
       SET cancelAtPeriodEnd = FALSE
       WHERE id = $1`,
      [userId]
    );

    res.json({
      message: "Subscription reactivated",
      current_period_end: subscription.current_period_end,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reactivate subscription" });
  }
});

// Protect routes
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired token." });
  }
}


app.post("/auth/forgot-password", forgotPassword);
app.post("/auth/reset-password", resetPassword);
app.post("/auth/logout", logoutHandler);


// app.get("/test-db", async (req, res) => {
//   try {
//     const result = await db.query("SELECT 1 AS ok");
//     res.json({ db: result.rows[0] });
//   } catch (err) {
//     console.error("DB connection error:", err);
//     res.status(500).json({ error: "Cannot connect to DB", details: err.message });
//   }
// });

export default app;