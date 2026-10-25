import db from "./db.js";

try {
    const [result] = await db.query("SELECT VERSION() AS version");

    console.log("MySQL connected successfully!");
    console.log("MySQL Version:", result[0].version);
} catch (error) {
    console.error("MySQL connection failed:", error.message);
} finally {
    await db.end();
}