const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Read Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;

  // No header at all
  if (!authHeader) {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  // Validate format
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Invalid token format",
    });
  }

  const token = parts[1];

  // Empty token
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  try {
    // Verify JWT using Render environment variable JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Make decoded payload available to routes
    // Example payload:
    // { schoolId: "test_school", iat: ..., exp: ... }
    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);

    return res.status(401).json({
      error: "Invalid token",
    });
  }
};