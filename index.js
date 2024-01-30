

const express = require("express");
const app = express();

const userRoutes = require("./routes/user");

const database = require("./config/database");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();
const cors = require("cors");

const PORT = process.env.PORT||4000;

database.connect();

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:3000",  // Update with your frontend's origin
        credentials: true,
    })
);

// routes
app.use("/api/v1/", userRoutes);

// default route
app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: 'Your server is up and running....',
    });
});

app.listen(PORT, () => {
    console.log(`App is running at ${PORT}`);
});

