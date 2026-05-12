const jwt = require("jsonwebtoken");

const JWT_SECRET = "super_secret_key_change_this";

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.school = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};