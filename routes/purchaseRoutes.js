
import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();

// GET: Display all purchases
router.get("/", async (req, res) => {
    try {
        const [purchases] = await db.query(`
            SELECT
                P.PurchaseID,
                P.IngredientID,
                I.IngredientName,
                P.QuantityPurchased,
                I.Unit,
                P.PurchaseDate,
                P.PurchasePrice,
                P.StaffID,
                S.Name AS StaffName
            FROM Purchase P
            JOIN Ingredient I
                ON P.IngredientID = I.IngredientID
            JOIN Staff S
                ON P.StaffID = S.StaffID
            ORDER BY P.PurchaseDate DESC
        `);

        return res.status(200).json({
            success: true,
            data: purchases
        });
    } catch (error) {
        console.error("Get purchases error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve purchases."
        });
    }
});

// GET: Display a single purchase
router.get("/:id", async (req, res) => {
    try {
        const [purchases] = await db.query(`
            SELECT
                P.PurchaseID,
                P.IngredientID,
                I.IngredientName,
                P.QuantityPurchased,
                I.Unit,
                P.PurchaseDate,
                P.PurchasePrice,
                P.StaffID,
                S.Name AS StaffName
            FROM Purchase P
            JOIN Ingredient I
                ON P.IngredientID = I.IngredientID
            JOIN Staff S
                ON P.StaffID = S.StaffID
            WHERE P.PurchaseID = ?
        `, [req.params.id]);

        if (purchases.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: purchases[0]
        });
    } catch (error) {
        console.error("Get purchase error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve purchase."
        });
    }
});

// POST: Add a purchase (Admin only)
router.post("/", checkAdmin, async (req, res) => {
    const {
        IngredientID,
        QuantityPurchased,
        PurchaseDate,
        PurchasePrice,
        StaffID
    } = req.body;

    if (
        IngredientID == null ||
        QuantityPurchased == null ||
        !PurchaseDate ||
        PurchasePrice == null ||
        StaffID == null
    ) {
        return res.status(400).json({
            success: false,
            message: "All purchase fields are required."
        });
    }

    const quantity = Number(QuantityPurchased);
    const price = Number(PurchasePrice);

    if (
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Quantity and purchase price must be non-negative numbers."
        });
    }

    try {
        // The AFTER INSERT trigger updates Ingredient stock automatically.
        const [result] = await db.query(
            `INSERT INTO Purchase
                (IngredientID, QuantityPurchased, PurchaseDate,
                 PurchasePrice, StaffID)
             VALUES (?, ?, ?, ?, ?)`,
            [
                IngredientID,
                quantity,
                PurchaseDate,
                price,
                StaffID
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Purchase recorded successfully.",
            data: {
                PurchaseID: result.insertId,
                IngredientID,
                QuantityPurchased: quantity,
                PurchaseDate,
                PurchasePrice: price,
                StaffID
            }
        });
    } catch (error) {
        console.error("Add purchase error:", error);

        if (
            error.code === "ER_NO_REFERENCED_ROW_2" ||
            error.code === "ER_NO_REFERENCED_ROW"
        ) {
            return res.status(400).json({
                success: false,
                message: "The specified ingredient or staff member does not exist."
            });
        }

        if (
            error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
            error.errno === 3819 ||
            error.code === "ER_DATA_OUT_OF_RANGE" ||
            error.code === "ER_TRUNCATED_WRONG_VALUE"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid purchase values. Check the quantity, price and date."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to record purchase."
        });
    }
});

// PUT: Update an existing purchase (Admin only)
router.put("/:id", checkAdmin, async (req, res) => {
    const {
        IngredientID,
        QuantityPurchased,
        PurchaseDate,
        PurchasePrice,
        StaffID
    } = req.body;

    if (
        IngredientID == null ||
        QuantityPurchased == null ||
        !PurchaseDate ||
        PurchasePrice == null ||
        StaffID == null
    ) {
        return res.status(400).json({
            success: false,
            message: "All purchase fields are required."
        });
    }

    const quantity = Number(QuantityPurchased);
    const price = Number(PurchasePrice);

    if (
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Quantity and purchase price must be non-negative numbers."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [purchases] = await connection.query(
            "SELECT * FROM Purchase WHERE PurchaseID = ? FOR UPDATE",
            [req.params.id]
        );

        if (purchases.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Purchase not found."
            });
        }

        const oldPurchase = purchases[0];

        // Lock both affected ingredient rows in a consistent order.
        const ingredientIDs = [
            Number(oldPurchase.IngredientID),
            Number(IngredientID)
        ];

        const uniqueIngredientIDs = [...new Set(ingredientIDs)].sort(
            (a, b) => a - b
        );

        const [ingredients] = await connection.query(
            `SELECT IngredientID, QuantityInStock
             FROM Ingredient
             WHERE IngredientID IN (${uniqueIngredientIDs.map(() => "?").join(",")})
             ORDER BY IngredientID
             FOR UPDATE`,
            uniqueIngredientIDs
        );

        const ingredientMap = new Map(
            ingredients.map((ingredient) => [
                Number(ingredient.IngredientID),
                Number(ingredient.QuantityInStock)
            ])
        );

        if (!ingredientMap.has(Number(IngredientID))) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "The specified ingredient does not exist."
            });
        }

        const oldIngredientID = Number(oldPurchase.IngredientID);
        const oldQuantity = Number(oldPurchase.QuantityPurchased);
        const oldStock = ingredientMap.get(oldIngredientID);

        // The stock after reversing the old purchase must remain non-negative.
        if (oldStock < oldQuantity) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Purchase cannot be updated because available stock is insufficient to reverse the old purchase."
            });
        }

        if (oldIngredientID === Number(IngredientID)) {
            const newStock = oldStock - oldQuantity + quantity;

            await connection.query(
                `UPDATE Ingredient
                 SET QuantityInStock = ?
                 WHERE IngredientID = ?`,
                [newStock, oldIngredientID]
            );
        } else {
            // Reverse the old quantity from the original ingredient.
            await connection.query(
                `UPDATE Ingredient
                 SET QuantityInStock = QuantityInStock - ?
                 WHERE IngredientID = ?`,
                [oldQuantity, oldIngredientID]
            );

            // Add the new quantity to the selected ingredient.
            await connection.query(
                `UPDATE Ingredient
                 SET QuantityInStock = QuantityInStock + ?
                 WHERE IngredientID = ?`,
                [quantity, IngredientID]
            );
        }

        // Update the existing record; do not insert a duplicate purchase.
        await connection.query(
            `UPDATE Purchase
             SET IngredientID = ?,
                 QuantityPurchased = ?,
                 PurchaseDate = ?,
                 PurchasePrice = ?,
                 StaffID = ?
             WHERE PurchaseID = ?`,
            [
                IngredientID,
                quantity,
                PurchaseDate,
                price,
                StaffID,
                req.params.id
            ]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Purchase updated successfully."
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Update purchase error:", error);

        if (
            error.code === "ER_NO_REFERENCED_ROW_2" ||
            error.code === "ER_NO_REFERENCED_ROW"
        ) {
            return res.status(400).json({
                success: false,
                message: "The specified ingredient or staff member does not exist."
            });
        }

        if (
            error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
            error.errno === 3819 ||
            error.code === "ER_DATA_OUT_OF_RANGE" ||
            error.code === "ER_TRUNCATED_WRONG_VALUE"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid purchase values. Check the quantity, price and date."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update purchase."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// DELETE: Delete a purchase (Admin only)
router.delete("/:id", checkAdmin, async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [purchases] = await connection.query(
            "SELECT * FROM Purchase WHERE PurchaseID = ? FOR UPDATE",
            [req.params.id]
        );

        if (purchases.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Purchase not found."
            });
        }

        const purchase = purchases[0];

        // Reverse the quantity added by this purchase.
        const [result] = await connection.query(
            `UPDATE Ingredient
             SET QuantityInStock = QuantityInStock - ?
             WHERE IngredientID = ?
               AND QuantityInStock >= ?`,
            [
                purchase.QuantityPurchased,
                purchase.IngredientID,
                purchase.QuantityPurchased
            ]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Purchase cannot be deleted because the available stock is insufficient."
            });
        }

        await connection.query(
            "DELETE FROM Purchase WHERE PurchaseID = ?",
            [req.params.id]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Purchase deleted successfully."
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Delete purchase error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete purchase."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

export default router;