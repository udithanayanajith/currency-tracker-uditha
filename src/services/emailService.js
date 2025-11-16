const nodemailer = require("nodemailer");

let transporter = null;

function initializeTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
}

async function sendAlertEmail(currency, rate, threshold) {
  if (!transporter) {
    initializeTransporter();
    if (!transporter) {
      return false;
    }
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ALERT_EMAIL || process.env.EMAIL_USER,
    subject: `Currency Alert: ${currency} Rate High!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Currency Exchange Alert</h2>
        <div style="background: #fff5f5; padding: 20px; border-radius: 5px; border-left: 4px solid #dc3545;">
          <h3 style="color: #dc3545; margin-top: 0;">${
            currency
          } Rate Alert</h3>
          <p><strong>Currency:</strong> ${currency}</p>
          <p><strong>Current Rate:</strong> <span style="color: #dc3545; font-weight: bold;">${
            rate
          } LKR</span></p>
          <p><strong>Threshold:</strong> ${threshold} LKR</p>
          <p><strong>Time:</strong> ${new Date}</p>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          This alert was triggered because the ${
            currency
          } exchange rate has crossed your defined threshold.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Initialize transporter on module load
initializeTransporter();

module.exports = {
  sendAlertEmail,
};
