const axios = require("axios");
const { db } = require("./firebase");

const apiKey = process.env.FASTFOREX_API_KEY;
const apiUrl = process.env.FASTFOREX_API_URL;

async function fetchExchangeRates() {
  try {
    const response = await axios.get(apiUrl, {
      params: {
        from: "LKR",
        to: "USD,GBP,EUR",
        api_key: apiKey,
      },
    });

    const data = response.data;

    if (!data.results) {
      throw new Error("Invalid API response: missing results field");
    }

    const currencyData = {
      USD: 1 / data.results.USD,
      EUR: 1 / data.results.EUR,
      GBP: 1 / data.results.GBP,
      timestamp: new Date(),
      base: "LKR",
    };

    return currencyData;
  } catch (error) {
    console.error("Error fetching currency rates:", error.message);
    throw error;
  }
}

async function storeRatesWithThresholds(rates, thresholds) {
  try {
    const formattedRates = {
      USD: parseFloat(rates.USD.toFixed(2)),
      EUR: parseFloat(rates.EUR.toFixed(2)),
      GBP: parseFloat(rates.GBP.toFixed(2)),
      thresholds: {
        USD: thresholds.USD,
        EUR: thresholds.EUR,
        GBP: thresholds.GBP,
      },
      timestamp: new Date(),
      base: rates.base,
    };

    // Store new rate
    await db.collection("exchangeRates").add(formattedRates);

    // Maintain only 7 latest records
    await maintainLatestRecords();

    return formattedRates;
  } catch (error) {
    console.error("Error storing rates in Firestore:", error);
    throw error;
  }
}

async function maintainLatestRecords() {
  try {
    // Get all records ordered by timestamp descending
    const snapshot = await db
      .collection("exchangeRates")
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.size > 7) {
      // Get records beyond the 7th position
      const recordsToDelete = snapshot.docs.slice(7);

      // Delete old records
      const deletePromises = recordsToDelete.map((doc) =>
        db.collection("exchangeRates").doc(doc.id).delete()
      );

      await Promise.all(deletePromises);
      console.log(
        `Deleted ${recordsToDelete.length} old records, keeping 7 latest`
      );
    }
  } catch (error) {
    console.error("Error maintaining latest records:", error);
  }
}

async function getRateHistory() {
  try {
    // Get 7 most recent records (newest first)
    const snapshot = await db
      .collection("exchangeRates")
      .orderBy("timestamp", "asc")
      .limit(7)
      .get();

    if (snapshot.empty) {
      console.log("No rate records found in database");
      return [];
    }

    const rates = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Convert timestamp to string immediately
      let timestampString;
      if (data.timestamp && data.timestamp._seconds) {
        // Firestore Timestamp with _seconds
        const date = new Date(data.timestamp._seconds * 1000);
        timestampString = date.toLocaleString();
      } else if (data.timestamp && data.timestamp.toDate) {
        // Firestore Timestamp object with toDate method
        timestampString = data.timestamp.toDate().toLocaleString();
      } else if (data.timestamp instanceof Date) {
        // Date object
        timestampString = data.timestamp.toLocaleString();
      } else if (typeof data.timestamp === "number") {
        // Timestamp as number (milliseconds)
        timestampString = new Date(data.timestamp).toLocaleString();
      } else {
        // Fallback
        timestampString = new Date().toLocaleString();
      }

      return {
        ...data,
        timestamp: timestampString,
        id: doc.id,
      };
    });

    console.log(` Retrieved ${rates.length} rate records from history`);

    // Debug: Show timestamps of retrieved records
    rates.forEach((rate, index) => {
      console.log(`   Record ${index + 1}: ${rate.timestamp}`);
    });

    // Return in chronological order (oldest first) for better display
    const chronologicalRates = rates.reverse();
    return chronologicalRates;
  } catch (error) {
    console.error("Error getting rate history:", error);
    return [];
  }
}

module.exports = {
  fetchExchangeRates,
  storeRatesWithThresholds,
  getRateHistory,
  maintainLatestRecords,
};
