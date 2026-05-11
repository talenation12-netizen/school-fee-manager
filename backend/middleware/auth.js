const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.schoolId = decoded.schoolId;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // SIMPLE VERSION (upgrade later to JWT verify)
    const token = header.replace("Bearer ", "");

    if (token !== "secure-token-abc") {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.schoolId = "SCHOOL_001";
    next();
  } catch (err) {
    res.status(401).json({ error: "Auth failed" });
  }
};