import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();

// Get all ingredients - Public access
router.get("/", async (req, res) => {
try {
const [ingredients] = await db.query(
"SELECT * FROM Ingredient"
);


    res.status(200).json({
        success: true,
        data: ingredients
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: "Failed to retrieve ingredients."
    });
}


});

// Get one ingredient - Public access
router.get("/:id", async (req, res) => {
try {
const [ingredients] = await db.query(
"SELECT * FROM Ingredient WHERE IngredientID = ?",
[req.params.id]
);


    if (ingredients.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Ingredient not found."
        });
    }

    res.status(200).json({
        success: true,
        data: ingredients[0]
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: "Failed to retrieve ingredient."
    });
}


});

// Add ingredient - Admin only
router.post("/", checkAdmin, async (req, res) => {
try {
const { IngredientName, QuantityInStock, Unit, ReorderLevel } = req.body;


    if (!IngredientName || !Unit) {
        return res.status(400).json({
            success: false,
            message: "IngredientName and Unit are required."
        });
    }

    const [result] = await db.query(
        `INSERT INTO Ingredient
         (IngredientName, QuantityInStock, Unit, ReorderLevel)
         VALUES (?, ?, ?, ?)`,
        [
            IngredientName.trim(),
            QuantityInStock ?? 0,
            Unit.trim(),
            ReorderLevel ?? 0
        ]
    );

    res.status(201).json({
        success: true,
        message: "Ingredient added successfully.",
        IngredientID: result.insertId
    });
} catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "This ingredient already exists."
        });
    }

    if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
        return res.status(400).json({
            success: false,
            message: "Stock quantity and reorder level cannot be negative."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to add ingredient."
    });
}


});

// Update ingredient - Admin only
router.put("/:id", checkAdmin, async (req, res) => {
try {
const { IngredientName, QuantityInStock, Unit, ReorderLevel } = req.body;


    if (
        !IngredientName ||
        QuantityInStock === undefined ||
        !Unit ||
        ReorderLevel === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: "IngredientName, QuantityInStock, Unit, and ReorderLevel are required."
        });
    }

    const [result] = await db.query(
        `UPDATE Ingredient
         SET IngredientName = ?, QuantityInStock = ?, Unit = ?, ReorderLevel = ?
         WHERE IngredientID = ?`,
        [
            IngredientName.trim(),
            QuantityInStock,
            Unit.trim(),
            ReorderLevel,
            req.params.id
        ]
    );

    if (result.affectedRows === 0) {
        const [ingredients] = await db.query(
            "SELECT IngredientID FROM Ingredient WHERE IngredientID = ?",
            [req.params.id]
        );

        if (ingredients.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Ingredient not found."
            });
        }
    }

    res.status(200).json({
        success: true,
        message: "Ingredient updated successfully."
    });
} catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "This ingredient name already exists."
        });
    }

    if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
        return res.status(400).json({
            success: false,
            message: "Stock quantity and reorder level cannot be negative."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to update ingredient."
    });
}


});

// Delete ingredient - Admin only
router.delete("/:id", checkAdmin, async (req, res) => {
try {
const [result] = await db.query(
"DELETE FROM Ingredient WHERE IngredientID = ?",
[req.params.id]
);


    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: "Ingredient not found."
        });
    }

    res.status(200).json({
        success: true,
        message: "Ingredient deleted successfully."
    });
} catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
            success: false,
            message: "Cannot delete this ingredient because it is used in recipes or purchases."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to delete ingredient."
    });
}


});

export default router;
