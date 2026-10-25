import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();

// Get all menu items - Public access
router.get("/", async (req, res) => {
try {
const [items] = await db.query(
`SELECT M.ItemID, M.ItemName, M.Price, M.Availability,
                    M.CategoryID, C.CategoryName
             FROM MenuItem M
             JOIN Category C ON M.CategoryID = C.CategoryID`
);


    res.status(200).json({
        success: true,
        data: items
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: "Failed to retrieve menu items."
    });
}


});

// Get one menu item - Public access
router.get("/:id", async (req, res) => {
try {
const [items] = await db.query(
`SELECT M.ItemID, M.ItemName, M.Price, M.Availability,
                    M.CategoryID, C.CategoryName
             FROM MenuItem M
             JOIN Category C ON M.CategoryID = C.CategoryID
             WHERE M.ItemID = ?`,
[req.params.id]
);


    if (items.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Menu item not found."
        });
    }

    res.status(200).json({
        success: true,
        data: items[0]
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: "Failed to retrieve menu item."
    });
}


});

// Add menu item - Admin only
router.post("/", checkAdmin, async (req, res) => {
try {
const { ItemName, Price, Availability, CategoryID } = req.body;


    if (!ItemName || Price === undefined || CategoryID === undefined) {
        return res.status(400).json({
            success: false,
            message: "ItemName, Price, and CategoryID are required."
        });
    }

    const [result] = await db.query(
        `INSERT INTO MenuItem (ItemName, Price, Availability, CategoryID)
         VALUES (?, ?, ?, ?)`,
        [
            ItemName.trim(),
            Price,
            Availability === undefined ? true : Availability,
            CategoryID
        ]
    );

    res.status(201).json({
        success: true,
        message: "Menu item added successfully.",
        ItemID: result.insertId
    });
} catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            success: false,
            message: "The specified category does not exist."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to add menu item."
    });
}


});

// Update menu item - Admin only
router.put("/:id", checkAdmin, async (req, res) => {
try {
const { ItemName, Price, Availability, CategoryID } = req.body;


    if (
        !ItemName ||
        Price === undefined ||
        Availability === undefined ||
        CategoryID === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: "ItemName, Price, Availability, and CategoryID are required."
        });
    }

    const [result] = await db.query(
        `UPDATE MenuItem
         SET ItemName = ?, Price = ?, Availability = ?, CategoryID = ?
         WHERE ItemID = ?`,
        [ItemName.trim(), Price, Availability, CategoryID, req.params.id]
    );

    if (result.affectedRows === 0) {
        const [items] = await db.query(
            "SELECT ItemID FROM MenuItem WHERE ItemID = ?",
            [req.params.id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found."
            });
        }
    }

    res.status(200).json({
        success: true,
        message: "Menu item updated successfully."
    });
} catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            success: false,
            message: "The specified category does not exist."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to update menu item."
    });
}


});

// Delete menu item - Admin only
router.delete("/:id", checkAdmin, async (req, res) => {
try {
const [result] = await db.query(
"DELETE FROM MenuItem WHERE ItemID = ?",
[req.params.id]
);


    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: "Menu item not found."
        });
    }

    res.status(200).json({
        success: true,
        message: "Menu item deleted successfully."
    });
} catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
            success: false,
            message: "Cannot delete this item because it is referenced by order details or ingredients."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to delete menu item."
    });
}


});

export default router;

