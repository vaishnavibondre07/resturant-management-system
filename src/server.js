import express from "express";
import dotenv from "dotenv";
import db from "./config/db.js";
import staffRoutes from "../routes/staffRoutes.js";
import categoryRoutes from "../routes/categoryRoutes.js";
import menuItemRoutes from "../routes/menuItemRoutes.js";
import orderRoutes from "../routes/orderRoutes.js";
import orderDetailsRoutes from "../routes/orderItemsRoutes.js";
import paymentRoutes from "../routes/paymentRoutes.js";
import ingredientRoutes from "../routes/ingredientsRoutes.js";
import checkAdmin from "../middleware/checkAdmin.js";
import reportRoutes from "../routes/reportRoute.js";
import viewRoutes from "../routes/viewRoutes.js";
import purchaseRoutes from "../routes/purchaseRoutes.js";
import menuPriceLogRoutes from "../routes/menuPriceLogRoutes.js";   


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/reports", checkAdmin, reportRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-details", orderDetailsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/joins", checkAdmin, reportRoutes);
app.use("/api/views", viewRoutes);
app.use("/api/menu-price-log", checkAdmin, menuPriceLogRoutes);

// Test API
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Restaurant Management System API is running!"
    });
});

// Test database connection
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.status(200).json({
            success: true,
            message: "API and MySQL database are connected successfully!"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});