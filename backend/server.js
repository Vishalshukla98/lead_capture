require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Resend } = require("resend");

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// Restrict to your Netlify domain in production.
// Add localhost for local dev if needed.
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "https://your-site.netlify.app",
      "http://localhost:3000",
    ],
  }),
);

app.use(express.json());

// ─── Resend client ───────────────────────────────────────────────────────────
// Resend uses HTTPS (port 443) — works on Render free tier.
// Gmail SMTP (port 587) is blocked by Render free tier — do not use.
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "marketing@telkosh.com";
const FROM_EMAIL = "Telkosh <marketing@telkosh.com>";

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Newsletter API Working ✅");
});

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ─── Subscribe ───────────────────────────────────────────────────────────────
app.post("/subscribe", async (req, res) => {
  const { email, name } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  console.log("=================================");
  console.log("New subscription request");
  console.log("Email:", email);
  if (name) console.log("Name:", name);

  // ── Step 1: HubSpot ────────────────────────────────────────────────────────
  try {
    const hubspotProperties = { email };
    if (name) hubspotProperties.firstname = name;

    const response = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      { properties: hubspotProperties },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Contact created in HubSpot, ID:", response.data.id);
  } catch (hubspotError) {
    if (hubspotError.response?.status === 409) {
      console.log("⚠ Contact already exists in HubSpot");
    } else {
      console.log("❌ HubSpot Error:", hubspotError.message);
      // Non-fatal: continue to send emails even if HubSpot fails
    }
  }

  // ── Step 2: Admin notification email ──────────────────────────────────────
  console.log("Sending admin notification email...");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: "New Newsletter Subscriber",
      html: `
        <h2>New Subscriber</h2>
        <p><strong>Email:</strong> ${email}</p>
        ${name ? `<p><strong>Name:</strong> ${name}</p>` : ""}
      `,
    });

    console.log("✅ Admin email sent");
  } catch (adminEmailError) {
    console.log("❌ Admin email failed:", adminEmailError.message);
    // Non-fatal: continue to send thank-you email
  }

  // ── Step 3: Return success ────────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    message: "Successfully subscribed",
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
