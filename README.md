# DanceFlow    https://danceflow.onrender.com/

DanceFlow is a web-based dance class booking system built using Node.js, Express, Mustache, and NeDB.

## Features

- Find  out about our dance boking system
- View and book dance classes and courses
- Organisers can manage classes, courses, and classes
- Role-based access (Admin, Manager, Public)
  - Public - users who can register and then login to book classes and courses
  - Admin - organisers who have access to add, update, and delete, classes and courses. Print reports of class, courses, and classes/courses bookings
  - Manager - same priveleges as Admin users but can can add, update, and delete users and organiser including assigning roles


## How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/ross-todd/Danceflow.git
   cd danceflow


2. Install dependencies:
   npm install

3. Set up the environment:

   Ensure your database file (users.db, classes.db, etc.) is set up correctly.

   Set environment variables if needed for JWT, DB paths, or other services. You can create a .env file to store sensitive data (e.g., JWT_SECRET, DB_PATH).

4. Run th eapplication:
   node index.js

5. Open your browser:
   http://localhost:3000

6. You can now:

   - Access the homepage and view available classes and courses
   - Register as a user and log in
   - Book classes and courses (as a public user)
   - Log in as an organiser (Admin or Manager) to manage content   


    
## How to Use

Public User
   - View our about page, classes paghe, courses page
   - Click the login button on th navbar and click Sign Up
   - Register as a user and log in
   - Book classes and courses
   
     Username: craigsmith@gcu.ac.uk    Password: Password123*
   

Amin User
   - Add, update, or delete, classes
   - Dispaly a list of classes
   - Add, update, or delete, courses
   - Dispaly a list of courses
   - Dispaly a list of class bookings
   - Dispaly a list of course bookings

     Username: jmorrison@gcu.ac.uk     Password: Password123*
  
Manager User  
   - Same priveleges as Admin users
   - Add, update, or delete, users, including assigning roles
   - Display a list of users

     Username: rosstodd@hotmail.co.uk  Password: Password123*



Usernames and passwords (all passwords are the same)

   - Public user   -  no admin panel rights:                                            
   - Admin user    -  Admin panell rights:                                              
   - Manager user  -  Full Admin rigts including adding, updating, deleting users       
  

All console.logs and error.lofgs have been redirected to a server.log file for logging  