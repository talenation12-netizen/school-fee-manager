module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];

    // simplified decode (replace with jwt.verify in production)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};