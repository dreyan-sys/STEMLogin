const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

// Ensure "uploads" directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Ensure "uploads.json" exists
const uploadsJson = path.join(__dirname, "uploads.json");
if (!fs.existsSync(uploadsJson)) {
    fs.writeFileSync(uploadsJson, JSON.stringify([]));
}

// Ensure "users.json" exists for storing user credentials
const usersJson = path.join(__dirname, "users.json");
if (!fs.existsSync(usersJson)) {
    fs.writeFileSync(usersJson, JSON.stringify([]));
}

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));
app.use("/uploads", express.static(uploadDir)); // Allows accessing uploaded files

// Authentication middleware
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    }
    next();
}

// Route to check login status
app.get("/status", (req, res) => {
    res.json({ loggedIn: !!req.session.user, user: req.session.user || null });
});

// User sign-up
app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    const users = JSON.parse(fs.readFileSync(usersJson));
    if (users.find(user => user.username === username)) {
        return res.status(400).json({ success: false, message: "Username already exists." });
    }

    users.push({ username, password });
    fs.writeFileSync(usersJson, JSON.stringify(users, null, 2));

    res.json({ success: true, message: "Sign-up successful! Please log in." });
});

// User login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersJson));
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    req.session.user = username;
    res.json({ success: true, message: "Login successful!" });
});

// User logout
app.post("/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: "Logged out successfully." });
});

// Configure file storage for uploads
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage });

// File upload route (Requires login)
app.post("/upload", requireLogin, upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const uploadData = {
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`,
        date: new Date().toLocaleString(),
        uploadedBy: req.session.user
    };

    // Save upload details
    const uploads = JSON.parse(fs.readFileSync(uploadsJson));
    uploads.push(uploadData);
    fs.writeFileSync(uploadsJson, JSON.stringify(uploads, null, 2));

    res.json({ success: true, ...uploadData });
});

// Route to get list of uploaded files (Requires login)
app.get("/files", requireLogin, (req, res) => {
    const uploads = JSON.parse(fs.readFileSync(uploadsJson));
    res.json(uploads);
});

// File delete route (Requires login)
app.delete("/delete/:filename", requireLogin, (req, res) => {
    const { filename } = req.params;
    const uploads = JSON.parse(fs.readFileSync(uploadsJson));

    const fileIndex = uploads.findIndex(file => file.filename === filename);
    if (fileIndex === -1) {
        return res.status(404).json({ success: false, message: "File not found." });
    }

    // Remove from uploads.json
    uploads.splice(fileIndex, 1);
    fs.writeFileSync(uploadsJson, JSON.stringify(uploads, null, 2));

    // Delete actual file
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: "File deleted successfully." });
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
