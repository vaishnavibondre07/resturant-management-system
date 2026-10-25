    -- SQL TRIGGERS

    -- TRIGGER 1: UPDATE ORDER TOTAL AFTER INSERT


    DELIMITER //

    CREATE TRIGGER trg_update_order_total_insert
    AFTER INSERT ON OrderDetails
    FOR EACH ROW
    BEGIN
        UPDATE Orders
        SET TotalAmount = (
            SELECT COALESCE(SUM(Subtotal), 0)
            FROM OrderDetails
            WHERE OrderID = NEW.OrderID
        )
        WHERE OrderID = NEW.OrderID;
    END //


    -- TRIGGER 2: UPDATE ORDER TOTAL AFTER UPDATE


    CREATE TRIGGER trg_update_order_total_update
    AFTER UPDATE ON OrderDetails
    FOR EACH ROW
    BEGIN
        -- Recalculate the old order if the item moves to another order.
        IF OLD.OrderID <> NEW.OrderID THEN
            UPDATE Orders
            SET TotalAmount = (
                SELECT COALESCE(SUM(Subtotal), 0)
                FROM OrderDetails
                WHERE OrderID = OLD.OrderID
            )
            WHERE OrderID = OLD.OrderID;
        END IF;

        -- Recalculate the new order.
        UPDATE Orders
        SET TotalAmount = (
            SELECT COALESCE(SUM(Subtotal), 0)
            FROM OrderDetails
            WHERE OrderID = NEW.OrderID
        )
        WHERE OrderID = NEW.OrderID;
    END //


    -- TRIGGER 3: UPDATE ORDER TOTAL AFTER DELETE


    CREATE TRIGGER trg_update_order_total_delete
    AFTER DELETE ON OrderDetails
    FOR EACH ROW
    BEGIN
        UPDATE Orders
        SET TotalAmount = (
            SELECT COALESCE(SUM(Subtotal), 0)
            FROM OrderDetails
            WHERE OrderID = OLD.OrderID
        )
        WHERE OrderID = OLD.OrderID;
    END //



    -- TRIGGER 4: UPDATE INGREDIENT STOCK AFTER PURCHASE

    CREATE TRIGGER trg_update_stock_after_purchase
    AFTER INSERT ON Purchase
    FOR EACH ROW
    BEGIN
        UPDATE Ingredient
        SET QuantityInStock = QuantityInStock + NEW.QuantityPurchased
        WHERE IngredientID = NEW.IngredientID;
    END //



    ---TRIGGER 5: PREVENT NEGATIVE INGREDIENT STOCK


    CREATE TRIGGER trg_prevent_negative_stock
    BEFORE UPDATE ON Ingredient
    FOR EACH ROW
    BEGIN
        IF NEW.QuantityInStock < 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ingredient stock cannot be negative';
        END IF;
    END //

    DELIMITER ;

    DELIMITER //

    CREATE TRIGGER trg_log_menu_price_change
    AFTER UPDATE ON MenuItem
    FOR EACH ROW
    BEGIN
        IF OLD.Price <> NEW.Price THEN
            INSERT INTO Menu_Price_Log (
                ItemID,
                OldPrice,
                NewPrice
            )
            VALUES (
                NEW.ItemID,
                OLD.Price,
                NEW.Price
            );
        END IF;
    END //

    DELIMITER ;