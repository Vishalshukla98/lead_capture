require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("Newsletter API Working ✅");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Newsletter API is running",
    time: new Date(),
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

  let hubspotData = null;

  try {
    console.log("Creating contact in HubSpot...");

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

      hubspotData = response.data;

      console.log("✅ Contact created in HubSpot");
      console.log("Contact ID:", response.data.id);
    } catch (hubspotError) {
      if (hubspotError.response && hubspotError.response.status === 409) {
        console.log("⚠ Contact already exists in HubSpot");
      } else {
        throw hubspotError;
      }
    }

    console.log("Sending admin notification email...");

    await transporter.sendMail({
      from: `"Telkosh" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "New Newsletter Subscriber",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2>New Newsletter Subscriber</h2>
          <p><strong>Email:</strong> ${email}</p>
        </div>
      `,
    });

    console.log("✅ Admin notification email sent");

    console.log("Sending thank you email...");

    await transporter.sendMail({
      from: `"Telkosh" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thank You for Subscribing to Telkosh",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;">
          <h2>Thank You for Subscribing!</h2>

          <p>Hello,</p>

          <p>
            Thank you for subscribing to the Telkosh newsletter.
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
        </div>
      `,
    });

    console.log("✅ Thank you email sent");

    res.status(200).json({
      success: true,
      message: "Subscription successful",
      data: hubspotData,
    });
  } catch (error) {
    console.log("❌ ERROR OCCURRED");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:", error.response.data);
    } else {
      console.log("Message:", error.message);
    }

    res.status(500).json({
      success: false,
      message: "Subscription failed",
      error: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log("=================================");
});

transporter.verify(function (error) {
  if (error) {
    console.log(error);
  } else {
    console.log("✅ Gmail Server Ready");
  }
});
