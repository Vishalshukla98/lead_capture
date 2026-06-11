require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Gmail Connection Error");
    console.log(error);
  } else {
    console.log("✅ Gmail Server Ready");
  }
});

app.get("/", (req, res) => {
  res.send("Newsletter API Working ✅");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
  });
});

app.get("/subscribe", (req, res) => {
  res.send("Subscribe endpoint is running ✅");
});

app.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  console.log("=================================");
  console.log("New subscription request");
  console.log("Email:", email);

  try {
    // HubSpot Contact
    try {
      const response = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          properties: {
            email: email,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("✅ Contact created in HubSpot");
      console.log("Contact ID:", response.data.id);
    } catch (hubspotError) {
      if (hubspotError.response?.status === 409) {
        console.log("⚠ Contact already exists in HubSpot");
      } else {
        console.log("HubSpot Error:", hubspotError.message);
      }
    }

    // Admin Email
    console.log("Sending admin email...");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Newsletter Subscriber",
      html: `
        <h2>New Subscriber</h2>
        <p><strong>Email:</strong> ${email}</p>
      `,
    });

    console.log("✅ Admin email sent");

    // Thank You Email
    console.log("Sending thank you email...");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Telkosh Newsletter",
      html: `
        <h2>Thank You for Subscribing!</h2>

        <p>Hello,</p>

        <p>
          Thank you for subscribing to the Telkosh Newsletter.
        </p>

        <p>
          You'll receive updates about:
        </p>

        <ul>
          <li>Bulk SMS Services</li>
          <li>WhatsApp Business API</li>
          <li>OTP Solutions</li>
          <li>Industry Updates</li>
        </ul>

        <br>

        <p>
          Regards,<br>
          <strong>Telkosh Team</strong>
        </p>
      `,
    });

    console.log("✅ Thank you email sent");

    return res.status(200).json({
      success: true,
      message: "Successfully subscribed",
    });
  } catch (error) {
    console.log("❌ ERROR OCCURRED");

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
