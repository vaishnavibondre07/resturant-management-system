const checkAdmin = (req, res, next) => {
    const role = req.headers.role;

    if (role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin only."
        });
    }

    next();
};

export default checkAdmin;