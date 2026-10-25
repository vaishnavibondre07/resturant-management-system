
import express from "express";
import db from "../src/config/db.js";

const router = express.Router();

const validOrderTypes = ["Dine-in", "Takeaway"];

// GET: Retrieve all orders
router.get("/", async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT O.*, S.Name AS StaffName
            FROM Orders O
            JOIN Staff S ON O.StaffID = S.StaffID
            ORDER BY O.OrderDateTime DESC
        `);

        return res.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error("Get orders error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve orders."
        });
    }
});

// GET: Retrieve a specific order with its items
router.get("/:id", async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT O.*, S.Name AS StaffName
            FROM Orders O
            JOIN Staff S ON O.StaffID = S.StaffID
            WHERE O.OrderID = ?
        `, [req.params.id]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const [items] = await db.query(`
            SELECT
                OD.OrderDetailID,
                OD.ItemID,
                M.ItemName,
                OD.Quantity,
                OD.UnitPrice,
                OD.Subtotal
            FROM OrderDetails OD
            JOIN MenuItem M ON OD.ItemID = M.ItemID
            WHERE OD.OrderID = ?
        `, [req.params.id]);

        return res.status(200).json({
            success: true,
            data: {
                ...orders[0],
                Items: items
            }
        });
    } catch (error) {
        console.error("Get order by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve order."
        });
    }
});

// POST: Create an order with multiple menu items
router.post("/", async (req, res) => {
    const {
        CustomerName,
        CustomerPhone,
        OrderType,
        TableNumber,
        StaffID,
        Items
    } = req.body;

    if (
        typeof CustomerName !== "string" ||
        !CustomerName.trim() ||
        !StaffID ||
        !Array.isArray(Items) ||
        Items.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: "CustomerName, StaffID, and Items are required."
        });
    }

    if (
        CustomerPhone != null &&
        typeof CustomerPhone !== "string"
    ) {
        return res.status(400).json({
            success: false,
            message: "CustomerPhone must be a string."
        });
    }

    if (!validOrderTypes.includes(OrderType)) {
        return res.status(400).json({
            success: false,
            message: "OrderType must be Dine-in or Takeaway."
        });
    }

    if (
        OrderType === "Dine-in" &&
        (TableNumber == null || !Number.isInteger(Number(TableNumber)) ||
         Number(TableNumber) <= 0)
    ) {
        return res.status(400).json({
            success: false,
            message: "A valid TableNumber is required for dine-in orders."
        });
    }

    const tableNumber = OrderType === "Takeaway"
        ? null
        : Number(TableNumber);

    for (const item of Items) {
        if (
            !Number.isInteger(Number(item.ItemID)) ||
            Number(item.ItemID) <= 0 ||
            !Number.isInteger(Number(item.Quantity)) ||
            Number(item.Quantity) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Each item must have a valid ItemID and positive Quantity."
            });
        }
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [staff] = await connection.query(
            "SELECT StaffID FROM Staff WHERE StaffID = ?",
            [StaffID]
        );

        if (staff.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Staff member does not exist."
            });
        }

        const orderDetails = [];

        for (const item of Items) {
            const [menuItems] = await connection.query(
                `SELECT ItemID, ItemName, Price, Availability
                 FROM MenuItem
                 WHERE ItemID = ?
                 FOR UPDATE`,
                [item.ItemID]
            );

            if (menuItems.length === 0 || !menuItems[0].Availability) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `Menu item ${item.ItemID} does not exist or is unavailable.`
                });
            }

            const menuItem = menuItems[0];
            const quantity = Number(item.Quantity);
            const unitPrice = Number(menuItem.Price);
            const subtotal = Number((unitPrice * quantity).toFixed(2));

            orderDetails.push({
                ItemID: menuItem.ItemID,
                ItemName: menuItem.ItemName,
                Quantity: quantity,
                UnitPrice: unitPrice,
                Subtotal: subtotal
            });
        }

        // Create order; the database default sets TotalAmount to 0 initially.
        const [orderResult] = await connection.query(
            `INSERT INTO Orders
                (CustomerName, CustomerPhone, OrderType, TableNumber, StaffID)
             VALUES (?, ?, ?, ?, ?)`,
            [
                CustomerName.trim(),
                CustomerPhone?.trim() || null,
                OrderType,
                tableNumber,
                StaffID
            ]
        );

        const orderID = orderResult.insertId;

        // The database triggers recalculate TotalAmount after each insert.
        for (const item of orderDetails) {
            await connection.query(
                `INSERT INTO OrderDetails
                    (OrderID, ItemID, Quantity, UnitPrice, Subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    orderID,
                    item.ItemID,
                    item.Quantity,
                    item.UnitPrice,
                    item.Subtotal
                ]
            );
        }

        // Read the final total maintained by the database trigger.
        const [savedOrders] = await connection.query(
            "SELECT TotalAmount FROM Orders WHERE OrderID = ?",
            [orderID]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Order created successfully.",
            data: {
                OrderID: orderID,
                CustomerName: CustomerName.trim(),
                CustomerPhone: CustomerPhone?.trim() || null,
                OrderType,
                TableNumber: tableNumber,
                StaffID,
                Items: orderDetails,
                TotalAmount: savedOrders[0].TotalAmount
            }
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Create order error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create order."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// PUT: Update an order and replace its items
router.put("/:id", async (req, res) => {
    const {
        CustomerName,
        CustomerPhone,
        OrderType,
        TableNumber,
        StaffID,
        Items
    } = req.body;

    if (
        typeof CustomerName !== "string" ||
        !CustomerName.trim() ||
        !StaffID ||
        !Array.isArray(Items) ||
        Items.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: "CustomerName, StaffID, and Items are required."
        });
    }

    if (
        CustomerPhone != null &&
        typeof CustomerPhone !== "string"
    ) {
        return res.status(400).json({
            success: false,
            message: "CustomerPhone must be a string."
        });
    }

    if (!validOrderTypes.includes(OrderType)) {
        return res.status(400).json({
            success: false,
            message: "OrderType must be Dine-in or Takeaway."
        });
    }

    if (
        OrderType === "Dine-in" &&
        (TableNumber == null || !Number.isInteger(Number(TableNumber)) ||
         Number(TableNumber) <= 0)
    ) {
        return res.status(400).json({
            success: false,
            message: "A valid TableNumber is required for dine-in orders."
        });
    }

    const tableNumber = OrderType === "Takeaway"
        ? null
        : Number(TableNumber);

    for (const item of Items) {
        if (
            !Number.isInteger(Number(item.ItemID)) ||
            Number(item.ItemID) <= 0 ||
            !Number.isInteger(Number(item.Quantity)) ||
            Number(item.Quantity) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Each item must have a valid ItemID and positive Quantity."
            });
        }
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingOrders] = await connection.query(
            "SELECT OrderID FROM Orders WHERE OrderID = ? FOR UPDATE",
            [req.params.id]
        );

        if (existingOrders.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const [staff] = await connection.query(
            "SELECT StaffID FROM Staff WHERE StaffID = ?",
            [StaffID]
        );

        if (staff.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Staff member does not exist."
            });
        }

        const orderDetails = [];

        for (const item of Items) {
            const [menuItems] = await connection.query(
                `SELECT ItemID, ItemName, Price, Availability
                 FROM MenuItem
                 WHERE ItemID = ?
                 FOR UPDATE`,
                [item.ItemID]
            );

            if (menuItems.length === 0 || !menuItems[0].Availability) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `Menu item ${item.ItemID} does not exist or is unavailable.`
                });
            }

            const menuItem = menuItems[0];
            const quantity = Number(item.Quantity);
            const unitPrice = Number(menuItem.Price);
            const subtotal = Number((unitPrice * quantity).toFixed(2));

            orderDetails.push({
                ItemID: menuItem.ItemID,
                ItemName: menuItem.ItemName,
                Quantity: quantity,
                UnitPrice: unitPrice,
                Subtotal: subtotal
            });
        }

        // Update order fields, but leave TotalAmount to the triggers.
        await connection.query(
            `UPDATE Orders
             SET CustomerName = ?,
                 CustomerPhone = ?,
                 OrderType = ?,
                 TableNumber = ?,
                 StaffID = ?
             WHERE OrderID = ?`,
            [
                CustomerName.trim(),
                CustomerPhone?.trim() || null,
                OrderType,
                tableNumber,
                StaffID,
                req.params.id
            ]
        );

        // Remove existing lines; delete trigger recalculates the total.
        await connection.query(
            "DELETE FROM OrderDetails WHERE OrderID = ?",
            [req.params.id]
        );

        // Insert replacement lines; insert trigger recalculates the total.
        for (const item of orderDetails) {
            await connection.query(
                `INSERT INTO OrderDetails
                    (OrderID, ItemID, Quantity, UnitPrice, Subtotal)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    req.params.id,
                    item.ItemID,
                    item.Quantity,
                    item.UnitPrice,
                    item.Subtotal
                ]
            );
        }

        const [savedOrders] = await connection.query(
            "SELECT TotalAmount FROM Orders WHERE OrderID = ?",
            [req.params.id]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Order updated successfully.",
            data: {
                OrderID: Number(req.params.id),
                CustomerName: CustomerName.trim(),
                CustomerPhone: CustomerPhone?.trim() || null,
                OrderType,
                TableNumber: tableNumber,
                StaffID,
                Items: orderDetails,
                TotalAmount: savedOrders[0].TotalAmount
            }
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Update order error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update order."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// DELETE: Delete an order and its items
router.delete("/:id", async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [orders] = await connection.query(
            "SELECT OrderID FROM Orders WHERE OrderID = ? FOR UPDATE",
            [req.params.id]
        );

        if (orders.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        // Remove order lines first; the delete trigger updates the total.
        await connection.query(
            "DELETE FROM OrderDetails WHERE OrderID = ?",
            [req.params.id]
        );

        // Delete the order.
        // This may fail if Payment rows reference this order.
        await connection.query(
            "DELETE FROM Orders WHERE OrderID = ?",
            [req.params.id]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Order and its items deleted successfully."
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Delete order error:", error);

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this order because it is referenced by a payment."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to delete order."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

export default router;