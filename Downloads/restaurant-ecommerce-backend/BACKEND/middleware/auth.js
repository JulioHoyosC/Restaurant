const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: "Token inválido" });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Acceso denegado. No sos admin." });
  }
};

module.exports = { auth, adminAuth };

