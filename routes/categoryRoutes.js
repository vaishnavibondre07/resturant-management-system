import express from "express";
import db from "../src/config/db.js";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();


// GET: Retrieve all categories
router.get("/", async (req, res) => {
    try {
        const [categories] = await db.query(
            "SELECT * FROM Category"
        );

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve categories."
        });
    }
});


// GET: Retrieve a category by ID
router.get("/:id", async (req, res) => {
    try {
        const [categories] = await db.query(
            "SELECT * FROM Category WHERE CategoryID = ?",
            [req.params.id]
        );

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        res.status(200).json({
            success: true,
            data: categories[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve category."
        });
    }
});


// POST: Add a new category (Admin only)
router.post("/", checkAdmin, async (req, res) => {
    try {
        const { CategoryName, Description } = req.body;

        if (!CategoryName || !CategoryName.trim()) {
            return res.status(400).json({
                success: false,
                message: "CategoryName is required."
            });
        }

        const [result] = await db.query(
            `INSERT INTO Category (CategoryName, Description)
             VALUES (?, ?)`,
            [
                CategoryName.trim(),
                Description?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Category added successfully.",
            CategoryID: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This category already exists."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to add category."
        });
    }
});


// PUT: Update a category (Admin only)
router.put("/:id", checkAdmin, async (req, res) => {
    try {
        const { CategoryName, Description } = req.body;

        if (!CategoryName || !CategoryName.trim()) {
            return res.status(400).json({
                success: false,
                message: "CategoryName is required."
            });
        }

        const [result] = await db.query(
            `UPDATE Category
             SET CategoryName = ?, Description = ?
             WHERE CategoryID = ?`,
            [
                CategoryName.trim(),
                Description?.trim() || null,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            const [categories] = await db.query(
                "SELECT CategoryID FROM Category WHERE CategoryID = ?",
                [req.params.id]
            );

            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found."
                });
            }
        }

        res.status(200).json({
            success: true,
            message: "Category updated successfully."
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This category name already exists."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update category."
        });
    }
});


// DELETE: Delete a category (Admin only)
router.delete("/:id", checkAdmin, async (req, res) => {
    try {
        const [result] = await db.query(
            "DELETE FROM Category WHERE CategoryID = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully."
        });
    } catch (error) {
        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete this category because menu items are associated with it."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to delete category."
        });
    }
});

export default router;

