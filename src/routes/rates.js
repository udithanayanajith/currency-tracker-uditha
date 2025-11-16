const express = require("express");
const router = express.Router();
const {
  fetchExchangeRates,
  storeRatesWithThresholds,
  getRateHistory,
} = require("../services/currencyService");

const { checkThresholds, getThresholds } = require("../services/alertService");

router.post("/fetch", async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    const thresholds = getThresholds();
    const storedRates = await storeRatesWithThresholds(rates, thresholds);
    await checkThresholds(rates);

    res.json({
      message: "Rates fetched and stored successfully",
      rates: storedRates,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const rates = await getRateHistory();
    res.json({
      success: true,
      data: rates,
      count: rates.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
