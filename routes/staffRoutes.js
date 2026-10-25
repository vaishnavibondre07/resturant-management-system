import express from "express";
import db from "../src/config/db.js";
import bcrypt from "bcryptjs";
import checkAdmin from "../middleware/checkAdmin.js";

const router = express.Router();

// Retrieve all staff members
router.get("/", checkAdmin, async (req, res) => {
try {
const [staff] = await db.query(
"SELECT StaffID, Name, Email, Role FROM Staff"
);

    res.status(200).json({
        success: true,
        data: staff
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: "Failed to retrieve staff."
    });
}


});

// Retrieve one staff member
router.get("/:id", checkAdmin, async (req, res) => {
try {
const [staff] = await db.query(
"SELECT StaffID, Name, Email, Role FROM Staff WHERE StaffID = ?",
[req.params.id]
);

    if (staff.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Staff member not found."
        });
    }

    res.status(200).json({
        success: true,
        data: staff[0]
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: "Failed to retrieve staff member."
    });
}


});

// Add a new staff member
router.post("/", checkAdmin, async (req, res) => {
try {
const { Name, Email, Password, Role } = req.body;


    if (!Name || !Email || !Password || !Role) {
        return res.status(400).json({
            success: false,
            message: "Name, Email, Password, and Role are required."
        });
    }

    if (!["admin", "staff"].includes(Role)) {
        return res.status(400).json({
            success: false,
            message: "Role must be admin or staff."
        });
    }

    const PasswordHash = await bcrypt.hash(Password, 10);

    const [result] = await db.query(
        `INSERT INTO Staff (Name, Email, PasswordHash, Role)
         VALUES (?, ?, ?, ?)`,
        [Name.trim(), Email.trim().toLowerCase(), PasswordHash, Role]
    );

    res.status(201).json({
        success: true,
        message: "Staff member added successfully.",
        StaffID: result.insertId
    });
} catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "This email is already registered."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to add staff member."
    });
}


});

// Update a staff member
router.put("/:id", checkAdmin, async (req, res) => {
try {
const { Name, Email, Role } = req.body;


    if (!Name || !Email || !Role) {
        return res.status(400).json({
            success: false,
            message: "Name, Email, and Role are required."
        });
    }

    if (!["admin", "staff"].includes(Role)) {
        return res.status(400).json({
            success: false,
            message: "Role must be admin or staff."
        });
    }

    const [result] = await db.query(
        `UPDATE Staff
         SET Name = ?, Email = ?, Role = ?
         WHERE StaffID = ?`,
        [Name.trim(), Email.trim().toLowerCase(), Role, req.params.id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: "Staff member not found."
        });
    }

    res.status(200).json({
        success: true,
        message: "Staff member updated successfully."
    });
} catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "This email is already registered."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to update staff member."
    });
}


});

// Delete a staff member
router.delete("/:id", checkAdmin, async (req, res) => {
try {
const [result] = await db.query(
"DELETE FROM Staff WHERE StaffID = ?",
[req.params.id]
);


    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: "Staff member not found."
        });
    }

    res.status(200).json({
        success: true,
        message: "Staff member deleted successfully."
    });
} catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
            success: false,
            message: "Cannot delete staff member because related records exist."
        });
    }

    res.status(500).json({
        success: false,
        message: "Failed to delete staff member."
    });
}

});

export default router;
