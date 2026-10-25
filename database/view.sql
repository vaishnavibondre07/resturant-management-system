-- 1. DAILY SALES SUMMARY
-- Shows the number of orders and total sales for each day.

CREATE OR REPLACE VIEW DailySalesSummary AS
SELECT
    DATE(OrderDateTime) AS SalesDate,
    COUNT(OrderID) AS TotalOrders,
    COALESCE(SUM(TotalAmount), 0) AS TotalSales
FROM Orders
GROUP BY DATE(OrderDateTime);


-- 2. MONTHLY SALES SUMMARY
-- Shows the number of orders and total sales for each month.

CREATE OR REPLACE VIEW MonthlySalesSummary AS
SELECT
    DATE_FORMAT(OrderDateTime, '%Y-%m') AS SalesMonth,
    COUNT(OrderID) AS TotalOrders,
    COALESCE(SUM(TotalAmount), 0) AS TotalSales
FROM Orders
GROUP BY DATE_FORMAT(OrderDateTime, '%Y-%m');


-- 3. PAYMENT SUMMARY
-- Shows each order's total, completed payments,and outstanding balance.

CREATE OR REPLACE VIEW PaymentSummary AS
SELECT
    O.OrderID,
    O.CustomerName,
    O.OrderDateTime,
    O.TotalAmount AS OrderTotal,

    COALESCE(
        SUM(
            CASE
                WHEN P.PaymentStatus = 'Completed'
                THEN P.AmountPaid
                ELSE 0
            END
        ),
        0
    ) AS TotalPaid,

    GREATEST(
        O.TotalAmount -
        COALESCE(
            SUM(
                CASE
                    WHEN P.PaymentStatus = 'Completed'
                    THEN P.AmountPaid
                    ELSE 0
                END
            ),
            0
        ),
        0
    ) AS OutstandingBalance

FROM Orders O
LEFT JOIN Payment P
    ON O.OrderID = P.OrderID

GROUP BY
    O.OrderID,
    O.CustomerName,
    O.OrderDateTime,
    O.TotalAmount;