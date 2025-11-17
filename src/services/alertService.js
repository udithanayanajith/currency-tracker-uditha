const { sendAlertEmail } = require("./emailService");

const thresholds = {
  USD: 330,
  EUR: 780,
  GBP: 50,
};

// const thresholds = {
//   USD: 330,
//   EUR: 370,
//   GBP: 420,
// };

async function checkThresholds(rates) {
  for (const [currency, rate] of Object.entries(rates)) {
    if (
      currency !== "timestamp" &&
      currency !== "base" &&
      currency !== "thresholds"
    ) {
      const threshold = thresholds[currency];

      if (threshold && rate > threshold) {
        // Send email notification
        await sendAlertEmail(currency, parseFloat(rate.toFixed(2)), threshold);

        // Trigger webhook for sound alert
        await sendWebhookAlert();
      }
    }
  }
}

async function sendWebhookAlert() {
  try {
    const response = await fetch(
      `http://localhost:${process.env.PORT || 3000}/webhook/alert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alert: "Threshold exceeded" }),
      }
    );

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error sending webhook:", error);
  }
}

function getThresholds() {
  return thresholds;
}

module.exports = {
  checkThresholds,
  getThresholds,
};
