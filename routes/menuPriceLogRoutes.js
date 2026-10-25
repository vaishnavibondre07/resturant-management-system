
import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();


router.use(checkAdmin);

// 1. Retrieve all menu price changes
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                L.LogID,
                L.ItemID,
                M.ItemName,
                L.OldPrice,
                L.NewPrice,
                L.ChangedAt
            FROM Menu_Price_Log L
            INNER JOIN MenuItem M
                ON L.ItemID = M.ItemID
            ORDER BY L.ChangedAt DESC, L.LogID DESC
        `);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Menu price log error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve menu price history."
        });
    }
});

// 2. Retrieve price history for a specific menu item
router.get("/:itemId", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                L.LogID,
                L.ItemID,
                M.ItemName,
                L.OldPrice,
                L.NewPrice,
                L.ChangedAt
            FROM Menu_Price_Log L
            INNER JOIN MenuItem M
                ON L.ItemID = M.ItemID
            WHERE L.ItemID = ?
            ORDER BY L.ChangedAt DESC, L.LogID DESC
        `, [req.params.itemId]);

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("Item price history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve item price history."
        });
    }
});

export default router;