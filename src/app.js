require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");

const {
  fetchExchangeRates,
  storeRatesWithThresholds,
} = require("./services/currencyService");

const { checkThresholds, getThresholds } = require("./services/alertService");
const ratesRoutes = require("./routes/rates");

const app = express();
const PORT = process.env.PORT || 3000;

let latestData = {
  rates: null,
  lastUpdate: null,
};

const sseClients = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/rates", ratesRoutes);
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.get("/api/events", (req, res) => {
  console.log("New SSE client connected");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
  });

  const clientId = Date.now();
  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      clientId: clientId,
      message: "SSE connection established",
    })}\n\n`
  );

  if (latestData.rates) {
    res.write(
      `data: ${JSON.stringify({
        type: "ratesUpdate",
        data: latestData.rates,
        timestamp: new Date(),
      })}\n\n`
    );
  }

  const client = {
    id: clientId,
    res,
  };
  sseClients.add(client);

  const heartbeat = setInterval(() => {
    if (sseClients.has(client)) {
      try {
        res.write(
          `data: ${JSON.stringify({
            type: "heartbeat",
            timestamp: new Date(),
          })}\n\n`
        );
      } catch (error) {
        clearInterval(heartbeat);
        sseClients.delete(client);
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    console.log(`SSE client disconnected: ${clientId}`);
    sseClients.delete(client);
    clearInterval(heartbeat);
  });

  req.on("error", (err) => {
    console.log(`SSE client error: ${err.message}`);
    sseClients.delete(client);
    clearInterval(heartbeat);
  });
});

function broadcastToClients(message) {
  const messageString = `data: ${JSON.stringify(message)}\n\n`;

  sseClients.forEach((client) => {
    if (client.res && !client.res.finished) {
      try {
        client.res.write(messageString);
      } catch (error) {
        sseClients.delete(client);
      }
    }
  });
}

app.post("/webhook/alert", (req, res) => {
  // Still keep webhook for sound alerts
  broadcastToClients({
    type: "alert",
    data: { message: "Threshold alert triggered" },
    timestamp: new Date(),
  });

  res.json({
    status: "Webhook processed successfully",
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

async function updateLatestData(rates) {
  latestData.rates = rates;
  latestData.lastUpdate = new Date();

  broadcastToClients({
    type: "ratesUpdate",
    data: latestData.rates,
    timestamp: new Date(),
  });
}

app.post("/api/fetch-realtime", async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    const thresholds = getThresholds();

    const storedRates = await storeRatesWithThresholds(rates, thresholds);
    await checkThresholds(rates);

    await updateLatestData(storedRates);

    res.json({
      message: "Rates fetched and real-time data updated successfully",
      rates: storedRates,
    });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/current", (req, res) => {
  if (!latestData.rates) {
    return res.status(404).json({
      error: "No data available yet",
      status: "no_data",
    });
  }

  res.json({
    success: true,
    data: latestData.rates,
    lastUpdate: latestData.lastUpdate,
  });
});

// Schedule daily rate fetch at 9 AM server time
cron.schedule("0 9 * * *", async () => {
  try {
    const rates = await fetchExchangeRates();
    const thresholds = getThresholds();

    const storedRates = await storeRatesWithThresholds(rates, thresholds);
    await checkThresholds(rates);

    await updateLatestData(storedRates);
  } catch (error) {
    console.error("Scheduled rate fetch failed:", error.message);
  }
});

app.listen(PORT, async () => {
  const thresholds = getThresholds();
  updateLatestData({
    USD: 0,
    EUR: 0,
    GBP: 0,
    thresholds: thresholds,
    timestamp: new Date(),
    base: "LKR",
  });

  try {
    const rates = await fetchExchangeRates();

    const storedRates = await storeRatesWithThresholds(rates, thresholds);
    await checkThresholds(rates);

    await updateLatestData(storedRates);
  } catch (error) {
    console.log(error);
    
    console.log("Initial rate fetch failed, will retry on schedule");
  }
});

module.exports = app;
