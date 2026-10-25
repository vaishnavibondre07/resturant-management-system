USE RestaurantManagement;

CREATE TABLE Staff (
    StaffID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('admin', 'staff') NOT NULL
);

CREATE TABLE Category (
    CategoryID INT PRIMARY KEY AUTO_INCREMENT,
    CategoryName VARCHAR(100) NOT NULL UNIQUE,
    Description VARCHAR(255)
);

CREATE TABLE MenuItem (
    ItemID INT PRIMARY KEY AUTO_INCREMENT,
    ItemName VARCHAR(100) NOT NULL,
    Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
    Availability BOOLEAN NOT NULL DEFAULT TRUE,
    CategoryID INT NOT NULL,
    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID)
);

CREATE TABLE Orders (
    OrderID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerName VARCHAR(100) NOT NULL,
    CustomerPhone VARCHAR(15),
    OrderDateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    OrderType ENUM('Dine-in', 'Takeaway') NOT NULL,
    TableNumber INT NULL,
    TotalAmount DECIMAL(10,2) DEFAULT 0.00,
    StaffID INT NOT NULL,
    FOREIGN KEY (StaffID)
        REFERENCES Staff(StaffID)
);

CREATE TABLE OrderDetails (
    OrderDetailID INT PRIMARY KEY AUTO_INCREMENT,
    OrderID INT NOT NULL,
    ItemID INT NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(10,2) NOT NULL CHECK (UnitPrice >= 0),
    Subtotal DECIMAL(10,2) NOT NULL CHECK (Subtotal >= 0),
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID),
    FOREIGN KEY (ItemID) REFERENCES MenuItem(ItemID)
);

CREATE TABLE Payment (
    PaymentID INT PRIMARY KEY AUTO_INCREMENT,
    OrderID INT NOT NULL,
    PaymentDateTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    AmountPaid DECIMAL(10,2) NOT NULL CHECK (AmountPaid >= 0),
    PaymentMethod ENUM('Cash', 'Card', 'UPI') NOT NULL,
    PaymentStatus ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID)
);

CREATE TABLE Menu_Price_Log (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    ItemID INT NOT NULL,
    OldPrice DECIMAL(10,2) NOT NULL,
    NewPrice DECIMAL(10,2) NOT NULL,
    ChangedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ItemID)
        REFERENCES MenuItem(ItemID)
);

CREATE TABLE Ingredient (
    IngredientID INT PRIMARY KEY AUTO_INCREMENT,
    IngredientName VARCHAR(100) NOT NULL UNIQUE,
    QuantityInStock DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (QuantityInStock >= 0),
    Unit VARCHAR(30) NOT NULL,
    ReorderLevel DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (ReorderLevel >= 0)
);

CREATE TABLE Purchase (
    PurchaseID INT PRIMARY KEY AUTO_INCREMENT,
    IngredientID INT NOT NULL,
    QuantityPurchased DECIMAL(10,2) NOT NULL CHECK (QuantityPurchased >= 0),
    PurchaseDate DATE NOT NULL,
    PurchasePrice DECIMAL(10,2) NOT NULL CHECK (PurchasePrice >= 0),
    StaffID INT NOT NULL,
    FOREIGN KEY (IngredientID) REFERENCES Ingredient(IngredientID),
    FOREIGN KEY (StaffID) REFERENCES Staff(StaffID)
);

