
import express from "express";
import db from "../src/config/db.js";

const router = express.Router();

// GET: Retrieve a specific order item
// Keep this route before /:orderId to avoid route matching ambiguity
router.get("/item/:id", async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT
                OD.OrderDetailID,
                OD.OrderID,
                OD.ItemID,
                M.ItemName,
                OD.Quantity,
                OD.UnitPrice,
                OD.Subtotal
             FROM OrderDetails OD
             JOIN MenuItem M ON OD.ItemID = M.ItemID
             WHERE OD.OrderDetailID = ?`,
            [req.params.id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order item not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: items[0]
        });
    } catch (error) {
        console.error("Get order item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve order item."
        });
    }
});


// GET: Retrieve all items belonging to a specific order
router.get("/:orderId", async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT
                OD.OrderDetailID,
                OD.OrderID,
                OD.ItemID,
                M.ItemName,
                OD.Quantity,
                OD.UnitPrice,
                OD.Subtotal
             FROM OrderDetails OD
             JOIN MenuItem M ON OD.ItemID = M.ItemID
             WHERE OD.OrderID = ?`,
            [req.params.orderId]
        );

        return res.status(200).json({
            success: true,
            data: items
        });
    } catch (error) {
        console.error("Get order items error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve order items."
        });
    }
});


// POST: Add an item to an order
router.post("/", async (req, res) => {
    const { OrderID, ItemID, Quantity, UnitPrice } = req.body;

    if (
        OrderID == null ||
        ItemID == null ||
        Quantity == null ||
        UnitPrice == null
    ) {
        return res.status(400).json({
            success: false,
            message: "OrderID, ItemID, Quantity and UnitPrice are required."
        });
    }

    const quantity = Number(Quantity);
    const unitPrice = Number(UnitPrice);

    if (
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive integer and UnitPrice must be non-negative."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const subtotal = quantity * unitPrice;

        const [result] = await connection.query(
            `INSERT INTO OrderDetails
                (OrderID, ItemID, Quantity, UnitPrice, Subtotal)
             VALUES (?, ?, ?, ?, ?)`,
            [OrderID, ItemID, quantity, unitPrice, subtotal]
        );

        // Database trigger automatically updates Orders.TotalAmount
        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Order item added successfully.",
            OrderDetailID: result.insertId
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        if (
            error.code === "ER_NO_REFERENCED_ROW_2" ||
            error.code === "ER_NO_REFERENCED_ROW"
        ) {
            return res.status(400).json({
                success: false,
                message: "The specified order or menu item does not exist."
            });
        }

        console.error("Add order item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add order item."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// PUT: Update an order item
router.put("/:id", async (req, res) => {
    const { OrderID, ItemID, Quantity, UnitPrice } = req.body;

    if (
        OrderID == null ||
        ItemID == null ||
        Quantity == null ||
        UnitPrice == null
    ) {
        return res.status(400).json({
            success: false,
            message: "OrderID, ItemID, Quantity and UnitPrice are required."
        });
    }

    const quantity = Number(Quantity);
    const unitPrice = Number(UnitPrice);

    if (
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a positive integer and UnitPrice must be non-negative."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingItems] = await connection.query(
            `SELECT OrderID
             FROM OrderDetails
             WHERE OrderDetailID = ?
             FOR UPDATE`,
            [req.params.id]
        );

        if (existingItems.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order item not found."
            });
        }

        const subtotal = quantity * unitPrice;

        await connection.query(
            `UPDATE OrderDetails
             SET OrderID = ?,
                 ItemID = ?,
                 Quantity = ?,
                 UnitPrice = ?,
                 Subtotal = ?
             WHERE OrderDetailID = ?`,
            [
                OrderID,
                ItemID,
                quantity,
                unitPrice,
                subtotal,
                req.params.id
            ]
        );

        // Database trigger automatically updates the affected order totals
        // including both orders if the item moves to a different order.
        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Order item updated successfully."
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        if (
            error.code === "ER_NO_REFERENCED_ROW_2" ||
            error.code === "ER_NO_REFERENCED_ROW"
        ) {
            return res.status(400).json({
                success: false,
                message: "The specified order or menu item does not exist."
            });
        }

        console.error("Update order item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update order item."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// DELETE: Remove an item from an order
router.delete("/:id", async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [items] = await connection.query(
            `SELECT OrderID
             FROM OrderDetails
             WHERE OrderDetailID = ?
             FOR UPDATE`,
            [req.params.id]
        );

        if (items.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order item not found."
            });
        }

        await connection.query(
            "DELETE FROM OrderDetails WHERE OrderDetailID = ?",
            [req.params.id]
        );

        // Database trigger automatically updates Orders.TotalAmount
        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Order item deleted successfully."
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Delete order item error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete order item."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

export default router;