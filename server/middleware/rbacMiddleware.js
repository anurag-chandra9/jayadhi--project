/**
 * @desc    Role-Based Access Control (RBAC) middleware
 * @param   {...string} allowedRoles - A list of roles that are allowed to access the route.
 * @returns {function} Express middleware function.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user should have been attached by the verifyToken middleware
    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "User role not found. Access denied."
      });
    }

    const userRole = req.user.role;

    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You do not have permission to access this resource."
      });
    }

    // If the role is allowed, proceed to the next middleware or controller
    next();
  };
};

module.exports = { authorize };