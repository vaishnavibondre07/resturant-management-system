
import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();

// Get all payments - Public access
router.get("/", async (req, res) => {
    try {
        const [payments] = await db.query(
            `SELECT P.*, O.CustomerName, O.OrderType
             FROM Payment P
             JOIN Orders O ON P.OrderID = O.OrderID
             ORDER BY P.PaymentDateTime DESC`
        );

        res.status(200).json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error("Get payments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve payments."
        });
    }
});

// Get one payment - Public access
router.get("/:id", async (req, res) => {
    try {
        const [payments] = await db.query(
            `SELECT P.*, O.CustomerName, O.OrderType
             FROM Payment P
             JOIN Orders O ON P.OrderID = O.OrderID
             WHERE P.PaymentID = ?`,
            [req.params.id]
        );

        if (payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found."
            });
        }

        res.status(200).json({
            success: true,
            data: payments[0]
        });
    } catch (error) {
        console.error("Get payment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve payment."
        });
    }
});

// Add payment
router.post("/", async (req, res) => {
    try {
        const { OrderID, AmountPaid, PaymentMethod, PaymentStatus } = req.body;

        if (
            OrderID === undefined ||
            AmountPaid === undefined ||
            !PaymentMethod
        ) {
            return res.status(400).json({
                success: false,
                message: "OrderID, AmountPaid, and PaymentMethod are required."
            });
        }

        if (!["Cash", "Card", "UPI"].includes(PaymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "PaymentMethod must be Cash, Card, or UPI."
            });
        }

        if (
            PaymentStatus !== undefined &&
            !["Pending", "Completed", "Failed"].includes(PaymentStatus)
        ) {
            return res.status(400).json({
                success: false,
                message: "PaymentStatus must be Pending, Completed, or Failed."
            });
        }

        const [result] = await db.query(
            `INSERT INTO Payment
                (OrderID, AmountPaid, PaymentMethod, PaymentStatus)
             VALUES (?, ?, ?, ?)`,
            [OrderID, AmountPaid, PaymentMethod, PaymentStatus ?? "Pending"]
        );

        res.status(201).json({
            success: true,
            message: "Payment recorded successfully.",
            PaymentID: result.insertId
        });
    } catch (error) {
        console.error("Add payment error:", error);

        if (
            error.code === "ER_NO_REFERENCED_ROW_2" ||
            error.code === "ER_NO_REFERENCED_ROW"
        ) {
            return res.status(400).json({
                success: false,
                message: "The specified order does not exist."
            });
        }

        if (
            error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
            error.errno === 3819
        ) {
            return res.status(400).json({
                success: false,
                message: "AmountPaid cannot be negative."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to record payment."
        });
    }
});

// Update payment
router.put("/:id", async (req, res) => {
    try {
        const { AmountPaid, PaymentMethod, PaymentStatus } = req.body;

        if (
            AmountPaid === undefined ||
            !PaymentMethod ||
            !PaymentStatus
        ) {
            return res.status(400).json({
                success: false,
                message: "AmountPaid, PaymentMethod, and PaymentStatus are required."
            });
        }

        if (!["Cash", "Card", "UPI"].includes(PaymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "PaymentMethod must be Cash, Card, or UPI."
            });
        }

        if (!["Pending", "Completed", "Failed"].includes(PaymentStatus)) {
            return res.status(400).json({
                success: false,
                message: "PaymentStatus must be Pending, Completed, or Failed."
            });
        }

        const [result] = await db.query(
            `UPDATE Payment
             SET AmountPaid = ?, PaymentMethod = ?, PaymentStatus = ?
             WHERE PaymentID = ?`,
            [AmountPaid, PaymentMethod, PaymentStatus, req.params.id]
        );

        if (result.affectedRows === 0) {
            const [payments] = await db.query(
                "SELECT PaymentID FROM Payment WHERE PaymentID = ?",
                [req.params.id]
            );

            if (payments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found."
                });
            }
        }

        res.status(200).json({
            success: true,
            message: "Payment updated successfully."
        });
    } catch (error) {
        console.error("Update payment error:", error);

        if (
            error.code === "ER_CHECK_CONSTRAINT_VIOLATED" ||
            error.errno === 3819
        ) {
            return res.status(400).json({
                success: false,
                message: "AmountPaid cannot be negative."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update payment."
        });
    }
});

// Delete payment - Admin only
router.delete("/:id", checkAdmin, async (req, res) => {
    try {
        const [result] = await db.query(
            "DELETE FROM Payment WHERE PaymentID = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Payment deleted successfully."
        });
    } catch (error) {
        console.error("Delete payment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete payment."
        });
    }
});

export default router;