CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100)
);

CREATE TABLE Questions (
    QuestionID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    UserMessage VARCHAR(500) NOT NULL,
    MessageReply VARCHAR(500),
    MessageStatus BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Nutritionist (
    NutritionistID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(50)
);

CREATE TABLE Admin (
    AdminID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(50) NOT NULL
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
    FOREIGN KEY (HAllID) REFERENCES DinningHalls(HallID)
);

CREATE TABLE UserGoals (
    UserID INT NOT NULL,
    Calories INT UNSIGNED NOT NULL,
    Fat INT UNSIGNED NOT NULL,
    Protein INT UNSIGNED NOT NULL,
    Carbs INT UNSIGNED NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Meals (
    MealID INT AUTO_INCREMENT PRIMARY KEY,
    FoodID INT NOT NULL,
    UserID INT NOT NULL,
    MealType VARCHAR(50) NOT NULL,
    FOREIGN KEY (FoodID) REFERENCES FoodCatalogue(FoodID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);


-- Insert sample users
INSERT INTO Users (FirstName, LastName, Email) VALUES
('Alice', 'Smith', 'alice.smith@example.com'),
('Bob', 'Johnson', 'bob.johnson@example.com'),
('Charlie', 'Lee', 'charlie.lee@example.com'),
('Dana', 'White', 'dana.white@example.com'),
('Evan', 'Brown', 'evan.brown@example.com');

-- Insert sample questions
INSERT INTO Questions (UserID, UserMessage, MessageReply, MessageStatus) VALUES
(1, 'What are the healthiest options at D2?', 'Try the fresh fruits and salad bar at D2.', TRUE),
(3, 'How many calories are in a West End burger?', 'A typical West End burger has ~600-800 calories.', TRUE),
(2, 'Do dining halls offer vegan options?', NULL, FALSE);

-- Insert sample nutritionists 
INSERT INTO Nutritionist (FirstName, LastName, Email) VALUES
('Nora', 'Green', 'ngreen@vt.edu'),
('Owen', 'Black', 'oblack@vt.edu');

-- Insert sample admin users
INSERT INTO Admin (FirstName, LastName, Email) VALUES
('Admin', 'One', 'admin1@vt.edu'),
('Admin', 'Two', 'admin2@vt.edu');

-- Insert dining halls
INSERT INTO DinningHalls (HallName) VALUES
('D2 at Dietrick Hall'),
('Turner Place at Lavery Hall'),
('West End Market at Cochrane Hall');

-- Insert sample food items with nutrition facts.
-- Columns: HallID, Calories, Fat (g), Protein (g), Carbs (g), ServingSize
INSERT INTO FoodCatalogue (HallID, Calories, Fat, Protein, Carbs, ServingSize) VALUES
(1, 103, 0, 2, 23, '1 Cup'),         
(1, 20, 2, 1, 0, '1 Each'),         
(1, 50, 4, 4, 0, '1 Oz'),       
(1, 144, 10, 11, 0, '3 Oz'),  
(2, 279, 13, 5, 35, '1 Biscuit'), 
(2, 422, 13, 5, 71, '4 Sticks'),
(1, 157, 8, 3, 21, '4 Oz'),
(3, 270, 10, 30, 13, '3 Oz'),
(3, 616, 39, 35, 29, '1 Burger'),
(3, 431, 32, 17, 25, '1 Hot Dog'),
(3, 579, 33, 27, 45, '1 Sandwich'),
(3, 420, 13, 18, 59, '1 Burger'),
(1, 160, 8, 2, 23, '1 Each'),
(1, 9, 0, 0, 2, '1 Oz'),
(3, 1261, 89, 103, 3, '12 Oz'),
(3, 586, 14, 9, 106, '14 Oz'),
(3, 538, 26, 29, 46, '5 Stks+Sce'),
(3, 412, 22, 20, 33, '4 Each'),
(1, 207, 8, 10, 25, '1/12 Pizza'),
(1, 300, 0, 6, 68, '1 Cup');



-- Insert sample user goals
INSERT INTO UserGoals (UserID, Calories, Fat, Protein, Carbs) VALUES
(1, 2000, 65, 50, 250), 
(2, 1800, 60, 70, 200), 
(3, 2200, 70, 80, 275), 
(4, 2500, 80, 100, 300),
(5, 1600, 50, 60, 180);

-- Insert sample meal records linking users to foods eaten
INSERT INTO Meals (FoodID, UserID, MealType) VALUES
(9, 1, 'Lunch'),
(14, 2, 'Snack'),
(8, 3, 'Dinner'),
(12, 4, 'Lunch'),
(5, 5, 'Breakfast');