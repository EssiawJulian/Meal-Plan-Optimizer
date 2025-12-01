DROP TABLE IF EXISTS FoodLogs;
DROP TABLE IF EXISTS MealPlanItems;
DROP TABLE IF EXISTS MealPlans;
DROP TABLE IF EXISTS UserGoals;
DROP TABLE IF EXISTS FoodCatalogue;
DROP TABLE IF EXISTS DinningHalls;
DROP TABLE IF EXISTS AdminSessions;
DROP TABLE IF EXISTS NutritionistSessions;
DROP TABLE IF EXISTS UserSessions;
DROP TABLE IF EXISTS Admin;
DROP TABLE IF EXISTS Nutritionist;
DROP TABLE IF EXISTS Questions;
DROP TABLE IF EXISTS Users;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100),
    PasswordHash VARCHAR(255) NOT NULL,
    UNIQUE (Email)
);

CREATE TABLE Questions (
    QuestionID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    UserMessage VARCHAR(500) NOT NULL,
    MessageReply VARCHAR(500),
    MessageStatus BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE Nutritionist (
    NutritionistID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(50),
    PasswordHash VARCHAR(255) NOT NULL,
    UNIQUE (Email)
);

CREATE TABLE Admin (
    AdminID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(50) NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    UNIQUE (Email)
);

CREATE TABLE UserSessions (
    SessionID CHAR(64) PRIMARY KEY,
    UserID INT NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt TIMESTAMP NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE NutritionistSessions (
    SessionID CHAR(64) PRIMARY KEY,
    NutritionistID INT NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt TIMESTAMP NULL,
    FOREIGN KEY (NutritionistID) REFERENCES Nutritionist(NutritionistID) ON DELETE CASCADE
);

CREATE TABLE AdminSessions (
    SessionID CHAR(64) PRIMARY KEY,
    AdminID INT NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiresAt TIMESTAMP NULL,
    FOREIGN KEY (AdminID) REFERENCES Admin(AdminID) ON DELETE CASCADE
);

CREATE TABLE DinningHalls (
    HallID INT AUTO_INCREMENT PRIMARY KEY,
    HallName VARCHAR(50) NOT NULL
);

CREATE TABLE FoodCatalogue (
    FoodID INT AUTO_INCREMENT PRIMARY KEY,
    HallID INT,
    FoodName VARCHAR(100) NOT NULL,
    Calories INT UNSIGNED NOT NULL,
    Fat INT UNSIGNED NOT NULL,
    Protein INT UNSIGNED NOT NULL,
    Carbs INT UNSIGNED NOT NULL,
    ServingSize VARCHAR(50) NOT NULL,
    FOREIGN KEY (HallID) REFERENCES DinningHalls(HallID)
);

CREATE TABLE UserGoals (
    UserID INT NOT NULL,
    Calories INT UNSIGNED NOT NULL,
    Fat INT UNSIGNED NOT NULL,
    Protein INT UNSIGNED NOT NULL,
    Carbs INT UNSIGNED NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE MealPlans (
    PlanID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    MealType VARCHAR(50) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE TABLE MealPlanItems (
    PlanID INT NOT NULL,
    FoodID INT NOT NULL,
    PRIMARY KEY (PlanID, FoodID),
    FOREIGN KEY (PlanID) REFERENCES MealPlans(PlanID) ON DELETE CASCADE,
    FOREIGN KEY (FoodID) REFERENCES FoodCatalogue(FoodID)
);

CREATE TABLE FoodLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    FoodID INT NOT NULL,
    MealType VARCHAR(50) NOT NULL,
    LogDate DATE NOT NULL DEFAULT (CURRENT_DATE),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (FoodID) REFERENCES FoodCatalogue(FoodID)
);

-- ==========================================
-- 3. INSERT DATA
-- ==========================================

-- Insert Users
INSERT INTO Users (FirstName, LastName, Email, PasswordHash) VALUES
('Alice', 'Smith', 'alice.smith@example.com', 'notrealpassword'),
('Bob', 'Johnson', 'bob.johnson@example.com', 'notrealpassword'),
('Charlie', 'Lee', 'charlie.lee@example.com', 'notrealpassword'),
('Dana', 'White', 'dana.white@example.com', 'notrealpassword'),
('Evan', 'Brown', 'evan.brown@example.com', 'notrealpassword');

-- Insert Questions
INSERT INTO Questions (UserID, UserMessage, MessageReply, MessageStatus) VALUES
(1, 'What are the healthiest options at D2?', 'Try the fresh fruits and salad bar at D2.', TRUE),
(3, 'How many calories are in a West End burger?', 'A typical West End burger has ~600-800 calories.', TRUE),
(2, 'Do dining halls offer vegan options?', NULL, FALSE);

-- Insert Nutritionists
INSERT INTO Nutritionist (FirstName, LastName, Email, PasswordHash) VALUES
('Owen', 'Black', 'oblack@vt.edu', 'notrealpassword');

-- Insert Admins
INSERT INTO Admin (FirstName, LastName, Email, PasswordHash) VALUES
('Admin', 'One', 'admin1@vt.edu', 'notrealpassword'),
('Admin', 'Two', 'admin2@vt.edu', 'notrealpassword');

-- Insert Dining Halls
INSERT INTO DinningHalls (HallName) VALUES
('D2 at Dietrick Hall'),
('Turner Place at Lavery Hall'),
('West End Market at Cochrane Hall');

-- Insert Food Items
INSERT INTO FoodCatalogue (HallID, FoodName, Calories, Fat, Protein, Carbs, ServingSize) VALUES
(1, 'Crispy Rice Cereal', 103, 0, 2, 23, '1 Cup'),
(1, 'Bacon, Gluten-Free (slice)', 20, 2, 1, 0, '1 Each'),
(1, 'Chicken Sausage Link', 50, 4, 4, 0, '1 Oz'),
(1, 'Scrambled Eggs', 144, 10, 11, 0, '3 Oz'),
(2, 'Buttermilk Biscuit', 279, 13, 5, 35, '1 Biscuit'),
(2, 'French Toast Sticks', 422, 13, 5, 71, '4 Sticks'),
(1, 'Hash Browns', 157, 8, 3, 21, '4 Oz'),
(3, 'London Broil Steak', 270, 10, 30, 13, '3 Oz'),
(3, 'Bacon Cheeseburger', 616, 39, 35, 29, '1 Burger'),
(3, 'Quarter Pound Hot Dog', 431, 32, 17, 25, '1 Hot Dog'),
(3, 'Fried Chicken Sandwich', 579, 33, 27, 45, '1 Sandwich'),
(3, 'Black Bean Burger w/ Cheese', 420, 13, 18, 59, '1 Burger'),
(1, 'Chocolate Chip Cookie', 160, 8, 2, 23, '1 Each'),
(1, 'Fresh Strawberries', 9, 0, 0, 2, '1 Oz'),
(3, 'Grilled Ribeye Steak (12 oz)', 1261, 89, 103, 3, '12 Oz'),
(3, 'Steak Fries (Full Basket)', 586, 14, 9, 106, '14 Oz'),
(3, 'Mozzarella Sticks (5 sticks + sauce)', 538, 26, 29, 46, '5 Stks+Sce'),
(3, 'Fried Potato Skins', 412, 22, 20, 33, '4 Each'),
(1, 'Cheese Pizza Slice', 207, 8, 10, 25, '1/12 Pizza'),
(1, 'Oatmeal', 300, 0, 6, 68, '1 Cup');

-- Insert User Goals
INSERT INTO UserGoals (UserID, Calories, Fat, Protein, Carbs) VALUES
(1, 2000, 65, 50, 250), 
(2, 1800, 60, 70, 200), 
(3, 2200, 70, 80, 275), 
(4, 2500, 80, 100, 300),
(5, 1600, 50, 60, 180);

-- Insert sample meal records into FoodLogs (History)
INSERT INTO FoodLogs (UserID, FoodID, MealType, LogDate) VALUES
(1, 9, 'Lunch', CURRENT_DATE),
(1, 15, 'Lunch', CURRENT_DATE),
(2, 14, 'Snack', CURRENT_DATE),
(3, 8, 'Dinner', CURRENT_DATE),
(3, 7, 'Dinner', CURRENT_DATE),
(4, 12, 'Lunch', CURRENT_DATE),
(5, 5, 'Breakfast', CURRENT_DATE),
(5, 4, 'Breakfast', CURRENT_DATE);

-- Insert sample meal plans (AI Suggestions)
INSERT INTO MealPlans (PlanID, UserID, MealType) VALUES
(1, 1, 'Lunch');

INSERT INTO MealPlanItems (PlanID, FoodID) VALUES
(1, 9), -- Bacon Cheeseburger
(1, 15); -- Steak Fries