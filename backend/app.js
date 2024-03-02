// backend/app.js
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const secretKey = "your_secret_key"; // Change this with your secret key

const mongoURI = "mongodb://127.0.0.1:27017"; // Change this with your MongoDB URI
const dbName = "bookingDB"; // Change this with your database name
const collectionName = "users"; // Change this with your collection name
const bookingCollectionName = "bookings";
app.use(bodyParser.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// MongoDB connection
let db;
MongoClient.connect(mongoURI)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db(dbName);
  })
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Check if user exists and credentials are correct
  const user = await db
    .collection(collectionName)
    .findOne({ username, password });

  if (user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Generate JWT token
  const token = jwt.sign({ username }, secretKey, { expiresIn: "1h" });

  res.json({ token });
});

// Booking endpoint
app.post("/book", async (req, res) => {
  const { name, date, time } = req.body;

  // Check if user is authenticated
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, secretKey, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Save booking data to MongoDB
    try {
      const result = await db
        .collection(bookingCollectionName)
        .insertOne({ name, date, time, userId: decoded.username });
      res.json({ message: "Booking successful" });
    } catch (error) {
      console.error("Error saving booking to MongoDB:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });
});

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dashbord.html"));
});

app.get("/dashboard", async (req, res) => {
  try {
    // Fetch bookings from MongoDB
    const bookings = await db
      .collection(bookingCollectionName)
      .find()
      .toArray();
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Example secured API endpoint
app.get("/api/data", verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      res.json({ message: "Secured data fetched successfully", authData });
    }
  });
});

function verifyToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearerToken = bearerHeader.split(" ")[1];
    req.token = bearerToken;
    next();
  } else {
    res.sendStatus(403);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
