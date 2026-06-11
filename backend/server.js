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
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("SMTP ERROR");
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

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  console.log("================================");
  console.log("New subscription request");
  console.log("Email:", email);

  try {

    try {

      await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          properties: {
            email,
          },
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.HUBSPOT_TOKEN}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      console.log("✅ Contact added to HubSpot");

    } catch (hubspotError) {

      if (
        hubspotError.response &&
        hubspotError.response.status === 409
      ) {

        console.log(
          "⚠ Contact already exists in HubSpot"
        );

      } else {

        console.log(
          "HubSpot Error:",
          hubspotError.message
        );

      }
    }

    console.log(
      "Sending admin notification..."
    );

    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: process.env.EMAIL_USER,

      subject:
        "New Newsletter Subscriber",

      html: `
        <h2>New Newsletter Lead</h2>
        <p>Email: ${email}</p>
      `,
    });

    console.log(
      "✅ Admin email sent"
    );

    console.log(
      "Sending thank-you email..."
    );

    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: email,

      subject:
        "Thank You For Subscribing",

      html: `
      <div style="font-family:Arial;padding:20px;">
      
      <h2>Thank You For Subscribing</h2>

      <p>
      Thank you for subscribing to the
      Telkosh Newsletter.
      </p>

      <p>
      You'll receive updates on:
      </p>

      <ul>
      <li>Bulk SMS</li>
      <li>WhatsApp Business API</li>
      <li>OTP Solutions</li>
      <li>Industry Updates</li>
      </ul>

      <br>

      <p>
      Regards,<br>
      Telkosh Team
      </p>

      </div>
      `,
    });

    console.log(
      "✅ Thank-you email sent"
    );

    return res.status(200).json({
      success: true,
      message:
        "Successfully subscribed",
    });

  } catch (error) {

    console.log("❌ ERROR OCCURRED");

    console.log(error);

    return res.status(500).json({
      success: false,
      message:
        "Subscription failed",
    });
  }
});

const PORT =
process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `🚀 Server running on port ${PORT}`
  );

});