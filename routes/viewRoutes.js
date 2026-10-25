import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();

// 1. DAILY SALES SUMMARY

router.get("/daily-sales", async (req, res) => {
    const role = req.headers.role;

    if (role !== "admin" && role !== "staff") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin or Staff only."
        });
    }

    try {
        const [rows] = await db.query(`
            SELECT *
            FROM DailySalesSummary
            ORDER BY SaleDate DESC
        `);

        res.status(200).json({
            success: true,
            message: "Daily sales summary retrieved successfully.",
            data: rows
        });

    } catch (error) {
        console.error("Daily sales summary error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve daily sales summary."
        });
    }
});


// 2. MONTHLY SALES SUMMARY


router.get("/monthly-sales", checkAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *
            FROM MonthlySalesSummary
            ORDER BY SaleMonth DESC
        `);

        res.status(200).json({
            success: true,
            message: "Monthly sales summary retrieved successfully.",
            data: rows
        });

    } catch (error) {
        console.error("Monthly sales summary error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve monthly sales summary."
        });
    }
});

// 3. PAYMENT SUMMARY


router.get("/payment-summary", checkAdmin, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *
            FROM PaymentSummary
            ORDER BY OrderDateTime DESC
        `);

        res.status(200).json({
            success: true,
            message: "Payment summary retrieved successfully.",
            data: rows
        });

    } catch (error) {
        console.error("Payment summary error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve payment summary."
        });
    }
});


export default router;