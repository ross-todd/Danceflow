const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// === Database Initializations ===
// Import all models and initialize databases
const Classes = require("../models/classesModel");
const classesDb = new Classes("classes.db");
classesDb.init();  // Initialize classes database

const Courses = require("../models/coursesModel");
const coursesDb = new Courses("courses.db");
coursesDb.init();

const BookedClasses = require("../models/bookedClassesModel");
const bookedClassesDb = new BookedClasses("bookedClasses.db");
bookedClassesDb.init();

const BookedCourses = require("../models/bookedCoursesModel");
const bookedCoursesDb = new BookedCourses("bookedCourses.db");
bookedCoursesDb.init();

const Users = require("../models/usersModel");
const usersDb = new Users("users.db");
usersDb.init();


// === Static Pages ===

exports.show_home_page = function (req, res) {
    res.render("index");
};

exports.show_about_page = function (req, res) {
    res.render("about");
};

// === User Registration and Login ===

// Show register page
exports.show_register_page = function (req, res) {
    console.log("Register route hit");
    res.render("register", { title: "Register Page" });
};

// Process login page
exports.process_register = function (req, res) {
    const { fname, lname, email, mobile, password, confirmPassword } = req.body;
    console.log("Form submission received.");
    console.log("Form data:", { fname, lname, email, mobile });

    // Basic validation
    if (!fname || !lname || !email || !mobile || !password || !confirmPassword) {
        console.log("Validation failed: Missing fields");
        return res.render("register", {
            title: "Register",
            error: "All fields are required."
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log("Validation failed: Invalid email format");
        return res.render("register", {
            title: "Register",
            error: "Please enter a valid email address."
        });
    }

    const mobileRegex = /^[0-9]{11}$/;
    if (!mobileRegex.test(mobile)) {
        console.log("Validation failed: Invalid mobile number format");
        return res.render("register", {
            title: "Register",
            error: "Please enter a valid 11-digit mobile number."
        });
    }

    if (password !== confirmPassword) {
        console.log("Validation failed: Passwords do not match!");
        return res.render("register", {
            title: "Register",
            error: "Passwords do not match!"
        });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/;
    if (!passwordRegex.test(password)) {
        console.log("Validation failed: Weak password!");
        return res.render("register", {
            title: "Register",
            error: "Please include a capital letter, a number, and a special character!"
        });
    }

    console.log("Checking if email or mobile exists...");
    usersDb.checkEmailOrMobile(email, mobile)
        .then(existing => {
            console.log("Check result:", existing);

            if (existing.length > 0) {
                console.log("Duplicate user found.");
                return res.render("register", {
                    title: "Register",
                    error: "Email or mobile number already in use."
                });
            }

            console.log("Hashing password...");
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    return res.status(500).render("register", {
                        title: "Register",
                        error: "An error occurred while processing your request."
                    });
                }

                console.log("Password hashed:", hashedPassword);
                console.log("Adding user to database...");
                usersDb.addUser(fname, lname, email, mobile, hashedPassword)
                    .then(() => {
                        console.log("User added successfully.");
                        return res.render("register", {
                            title: "Register",
                            success: "Registration complete! You can now log in."
                        });
                    })
                    .catch(err => {
                        console.error("Error adding user to database:", err);
                        return res.status(500).render("register", {
                            title: "Register",
                            error: "An error occurred during registration. Please try again."
                        });
                    });
            });
        })
        .catch(err => {
            console.error("Error checking email or mobile:", err);
            return res.status(500).render("register", {
                title: "Register",
                error: "An error occurred during registration. Please try again."
            });
        });
};

// Show login page
exports.show_login_page = function (req, res) {
    console.log("Login route hit");
    res.render("login", { title: "Login Page" });
    
};

// Process login 
exports.process_login = function (req, res) {
    const { email, password } = req.body;
    
    // Log login attempt only once in the controller
    console.log("Login attempt:", { email, password });

    if (!email || !password) {
        console.log("Missing email or password");
        return res.render("login", {
            title: "Login",
            error: "Please enter both email and password"
        });
    }

    usersDb.checkUsersDetails(email, password)
        .then(result => {
            // Handle error and locked status only once here
            if (result.error) {
                console.log(result.error); // Log error message
                return res.render("login", {
                    title: "Login",
                    error: result.error
                });
            }

            // Handle locked user status
            if (result.locked) {
                const unlockTime = new Date(result.unlockTime).toLocaleString();
                console.log(`User locked out until ${unlockTime}`); // Log locked out status
                return res.render("login", {
                    title: "Login",
                    error: `Account is locked. Try again after ${unlockTime}.`
                });
            }

            // Proceed with successful login
            const user = result.user;
            console.log(`User authenticated: ${user.email} (${user.role})`);

            const payload = { email: user.email, role: user.role };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
            console.log("JWT cookie set.");

            if (user.role === 'Public') {
                return res.redirect('/classes');
            } else {
                return res.redirect('/admin');
            }
        })
        .catch(err => {
            console.error("Login error:", err); // Log unexpected errors
            return res.status(500).render("login", {
                title: "Login",
                error: "Internal Server Error"
            });
        });
};





// Logout
exports.logout = function (req, res) {
    console.log("Logging out...");
    res.clearCookie("jwt", { httpOnly: true, secure: process.env.NODE_ENV === 'production' }).status(200);
    console.log("JWT cookie cleared. Redirecting to home page.");
    res.locals.isLoggedIn = false;
    return res.redirect('/');
};


// === Class Section ===

exports.show_classes_page = function (req, res) {
    console.log('Show classes page route triggered');
    classesDb.getAllClasses()
        .then(classes => {
            console.log('Classes fetched:', classes);

            // Sort by day of the week
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const sortedClasses = classes.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

            // Format for display
            const classNames = sortedClasses.map(classItem => ({
                _id: classItem._id,
                name: classItem.name,
                day: classItem.day,
                location: classItem.location,
                time: classItem.time,
                price: classItem.price
            }));

            res.render("classes", { 
                showButton: false, 
                classOptions: classNames, 
                classes: sortedClasses
            });
        })
        .catch(err => {
            console.error('Error fetching classes:', err);
            res.status(500).send("Error fetching classes.");
        });
};

// Get class by ID
exports.get_class_by_id = function (req, res) {
    const classId = req.params.id;

    classesDb.getClassById(classId)
        .then(classData => {
            if (classData) {
                res.json(classData);
            } else {
                res.status(404).json({ error: 'Class not found' });
            }
        })
        .catch(err => {
            console.error("Error fetching class data:", err);
            res.status(500).json({ error: 'Unable to fetch class' });
        });
};



// === Courses Section ===

exports.show_courses_page = function (req, res) {
    console.log('Show courses page route triggered');
    coursesDb.getAllCourses()
        .then(courses => {
            console.log('Courses fetched:', courses);

            if (!courses || courses.length === 0) {
                console.log('No courses found.');
            }

            // Month order for sorting (quarters)
            const monthOrder = {
                'January': 1, 'February': 2, 'March': 3,  // Jan - Mar = 1
                'April': 4, 'May': 5, 'June': 6,          // Apr - Jun = 2
                'July': 7, 'August': 8, 'September': 9,   // Jul - Sep = 3
                'October': 10, 'November': 11, 'December': 12 // Oct - Dec = 4
            };

            // Check the month field in the courses before sorting
            console.log('Course months before sorting: ', courses.map(course => course.month));

            // Sort the courses by the start month only (e.g., 'Jan - Mar' -> 'Jan')
            courses.sort((a, b) => {
                // Extract the start month from the range (e.g., 'Jan - Mar' -> 'Jan')
                const monthA = a.month.split(' - ')[0];  // Get the first month (e.g., 'Jan' from 'Jan - Mar')
                const monthB = b.month.split(' - ')[0];  // Get the first month (e.g., 'Jan' from 'Jan - Mar')

                // Map extracted months to their order
                const monthOrderA = monthOrder[monthA] || 0;
                const monthOrderB = monthOrder[monthB] || 0;

                // Compare based on the order of the start month
                return monthOrderA - monthOrderB;
            });

            // Log sorted courses to verify sorting
            console.log('Courses sorted by start month:', courses.map(course => `${course.name} - ${course.month}`));

            const courseNames = courses.map(course => ({
                _id: course._id,
                name: course.name,
                month: course.month,
                schedule: course.schedule,
                price: course.price
            }));

            res.render("courses", {
                showButton: false,
                courseOptions: courseNames,
                courses: courses
            });
        })
        .catch(err => {
            console.error('Error fetching courses:', err);
            res.status(500).send("Error fetching courses.");
        });
};









// Get Course by ID
exports.get_course_by_id = function (req, res) {
    const courseId = req.params.id;
    coursesDb.getCourseById(courseId)
        .then(courseData => {
            if (courseData) {
                res.json(courseData);
            } else {
                res.status(404).json({ error: "Course not found" });
            }
        })
        .catch(err => {
            console.error("Error fetching course data:", err);
            res.status(500).json({ error: "Unable to fetch course" });
        });
};


// === Class Bookings Section ===

// Show booking form
exports.show_class_booking_form = function (req, res) {
    console.log("Rendering booking form");
    res.render("bookClass", { title: "Book a Class" });
};

// Handle booking form submission
exports.process_class_bookings = function (req, res) {
    console.log("Received booking form data:", req.body);

    // Check user auth
    if (!req.user || req.user.role !== 'Public') {
        console.log("User not authenticated or not a public user.");
        return res.status(403).json({ success: false, message: "You must be logged in to book a class." });
    }

    // Destructure booking details from the request body
    const { name, email, className, day, location, time, price } = req.body;

    // Validate all required fields are present
    if (!name || !email || !className || !day || !location || !time || !price) {
        console.log("Missing required fields.");
        return res.json({ success: false, message: "All fields are required." });
    }

    // Check if the user has already booked the same class
    bookedClassesDb.getClassBookingByUserAndClass(email, className, day, location, time, price)
        .then(existingBooking => {
            if (existingBooking) {
                console.log("Booking already exists.");
                return res.json({ success: false, message: "You have already booked this class." });
            }
            
            // If no existing booking, save the new booking to the database
            return bookedClassesDb.addClassBooking(name, email, className, day, location, time, price)
                .then(() => {
                    console.log("Class booking successful.");
                    res.json({ success: true, message: "Class Booking Successful!" });
                });
        })
        .catch(err => {
            console.error("Booking error:", err);
            res.json({ success: false, message: "Error booking class. Please try again later." });
        });
};





// === Course Bookings Section ===

// Show course booking form
exports.show_course_booking_form = function (req, res) {
    console.log("Rendering course booking form");
    res.render("bookCourse", { title: "Book a Course" });
};

// Process course booking
exports.process_course_bookings = function (req, res) {
    console.log("Received course booking data:", req.body);

    // Check if user is authenticated and has 'public' role
    if (!req.user || req.user.role !== 'Public') {
        console.log("User not authenticated or not a public user. User role:", req.user ? req.user.role : "None");
        return res.status(403).json({ success: false, message: "You must be logged in to book a course." });
    }

    // Booking details from the request body
    const { name, email, courseName, month, location, schedule, price } = req.body;

    // Check if all required fields are present
    if (!name || !email || !courseName || !month || !location || !schedule || !price) {
        console.log("Missing required fields in the booking data.");
        return res.json({ success: false, message: "All fields are required." });
    }

    // Check for existing booking first
    bookedCoursesDb.getCourseBookingByUserAndCourse(email, courseName, month, location, schedule,)
        .then(existingBooking => {
            if (existingBooking) {
                console.log("User has already booked this course.");
                return res.json({
                    success: false,
                    message: "You have already booked this course."
                });
            }

            // If no existing booking, proceed to add new one
            return bookedCoursesDb.addCourseBooking(name, email, courseName, month, location, schedule, price)
                .then(() => {
                    console.log("Course booking successfully processed.");
                    res.json({
                        success: true,
                        message: "Course Booking Successful!"
                    });
                });
        })
        .catch((err) => {
            console.error("Booking error:", err);
            res.json({
                success: false,
                message: "Error booking course. Please try again later."
            });
        });
};


// === Admin Page ===

exports.show_admin_page = function (req, res) {
    console.log("Authenticated user in /admin:", req.user);

    Promise.all([
        coursesDb.getAllCourses(),
        classesDb.getAllClasses(),
        bookedClassesDb.getAllBookedClasses(),
        bookedCoursesDb.getAllBookedCourses(),
        usersDb.getAllUsers(),
    ])
    .then(([courses, classes, { sortedDocs }, { sortedCourses }, users]) => {
        console.log("Users retrieved from DB:", users);
        if (!courses || !classes || !sortedDocs || !sortedCourses || !users) {
            return res.status(500).send("Failed to fetch data.");
        }
   
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedClasses = classes.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));
   
        const groupedClassMap = new Map();
        sortedDocs.forEach(booking => {
            const className = booking.className;
            if (!groupedClassMap.has(className)) {
                groupedClassMap.set(className, {
                    className: className,
                    count: 1,
                    bookings: [booking]
                });
            } else {
                const group = groupedClassMap.get(className);
                group.count += 1;
                group.bookings.push(booking);
            }
        });
        const groupedClassBookings = Array.from(groupedClassMap.values());
   
        const groupedCourseMap = new Map();
        sortedCourses.forEach(booking => {
            const courseName = booking.courseName;
            if (!groupedCourseMap.has(courseName)) {
                groupedCourseMap.set(courseName, {
                    courseName: courseName,
                    count: 1,
                    bookings: [booking]
                });
            } else {
                const group = groupedCourseMap.get(courseName);
                group.count += 1;
                group.bookings.push(booking);
            }
        });
        const groupedCourseBookings = Array.from(groupedCourseMap.values());
   
        // Get all users instead of just Admin and Manager
        const allUsers = users; // This includes Public, Admin, and Manager roles
   
        // Check if the user is a Manager
        const isManager = req.user && req.user.role === 'Manager';
   
        // Render the admin page
        res.render("admin", {
            showButton: false,
            classOptions: sortedClasses,
            courseOptions: courses,
            groupedClassBookings,
            groupedCourseBookings,
            users: allUsers, // Pass all users to the view
            isManagerOnly: isManager, // Pass this flag to control access to the organisers section
        });
    })
    .catch(err => {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data.");
    });
};


// Add new Class
exports.add_new_class = function (req, res) {
    console.log("Processing add_new_class controller");

    const { name, day, location, time, price, description } = req.body;
    let classErrors = {};  // Change errors to classErrors

    // Validate required fields
    if (!name || !day || !location || !time || !price || !description) {
        classErrors.form = "All fields are required.";  // Use classErrors
    }

    // Validate name
    if (!name || name.trim().length <= 2) {
        classErrors.name = "Class title must be more than 2 characters.";  // Use classErrors
    }

    // Validate description
    if (!description || description.trim().length <= 10) {
        classErrors.description = "Description must be more than 10 characters.";  // Use classErrors
    }

    // If there are errors, render the form with data
    if (Object.keys(classErrors).length > 0) {
        return Promise.all([
            coursesDb.getAllCourses(),
            classesDb.getAllClasses(),
            bookedClassesDb.getAllBookedClasses(),
            bookedCoursesDb.getAllBookedCourses(),
            usersDb.getAllUsers()
        ]).then(([allCourses, allClasses, allBookedClasses, allBookedCourses, allUsers]) => {
            return res.render("admin", {
                classErrors: classErrors,  // Pass classErrors to the view
                formData: { name, day, location, time, price, description },
                courses: allCourses,
                classes: allClasses,
                bookedClasses: allBookedClasses,
                bookedCourses: allBookedCourses,
                organisers: allUsers
            });
        });
    }

    // If no errors, proceed to insert the new class
    const newClass = { name, day, location, time, price, description };

    console.log('New class to be inserted:', newClass);

    // Add the new class
    classesDb.addClass(name, day, location, time, price, description)
        .then(() => classesDb.getAllClasses())
        .then(classes => {
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const sortedClasses = classes.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

            res.redirect("/admin"); // Redirect to admin page after successful addition
        })
        .catch(err => {
            console.error("Error adding classes:", err);
            res.status(500).send("Failed to add classes: " + err.message);
        });
};

// Update class
exports.update_class = function (req, res) {
    console.log(req.body);

    const { id, name, description, day, location, time, price } = req.body;

    // Check if all required fields are provided
    if (!id || !name || !description || !day || !location || !time || !price) {
        return res.status(400).send("All fields (id, name, day, location, time, price) are required to update the class.");
    }

    // Fetch the class by its ID to check if it exists
    classesDb.getClassById(id)
        .then(classData => {
            if (!classData) return res.status(404).send("Class not found.");

            // Update the class with new data, including location
            const updatedClass = { name, description, day, location, time, price };
            return classesDb.updateClassById(id, updatedClass);
        })
        .then(() => classesDb.getAllClasses())  // Fetch all classes after the update
        .then(classes => {
            // Sort the classes by day of the week
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const sortedClasses = classes.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

            // Redirect to the admin page after successful update
            res.redirect("/admin");
        })
        .catch(err => {
            console.error("Error updating classes:", err);
            res.status(500).send("Update failed: " + err.message);
        });
};

// Delete Class
exports.delete_class = function (req, res) {
    const classId = req.body.id; 
    console.log('DELETE CLASS ACTION HIT - ID:', classId);

    if (!classId) {
        return res.status(400).send('Class ID is required.');
    }

    classesDb.deleteClass(classId)
        .then(numRemoved => {
            if (numRemoved > 0) {
                return classesDb.getAllClasses();
            } else {
                return res.status(404).send('Class not found.');
            }
        })
        .then(classes => {
            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const sortedClasses = classes.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));

            res.redirect("/admin");
        })
        .catch(err => {
            console.error('Error deleting classes:', err);
            res.status(500).send('Error deleting classes.');
        });
};


// Add new Course
exports.add_new_course = function (req, res) {
    console.log("Processing add_new_course controller");

    const { name, description, month, location, schedule, price } = req.body;
    let courseErrors = {};

    if (!name || !description || !month || !location || !schedule || !price) {
        courseErrors.form = "All fields are required.";
    }

    if (!name || name.trim().length <= 2) {
        courseErrors.name = "Course title must be more than 2 characters.";
    }

    if (!description || description.trim().length <= 10) {
        courseErrors.description = "Description must be more than 10 characters.";
    }

    const scheduleRegex = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s\d{2}:\d{2}\s-\s\d{2}:\d{2}$/;
    if (!schedule || !scheduleRegex.test(schedule)) {
        courseErrors.schedule = "Schedule must include a valid day and time (e.g., Monday 09:00 - 10:30).";
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    function groupBookings(bookings, key) {
        const groupedMap = new Map();
        bookings.forEach(b => {
            const value = b[key];
            if (!groupedMap.has(value)) {
                groupedMap.set(value, { [key]: value, count: 1, bookings: [b] });
            } else {
                const group = groupedMap.get(value);
                group.count += 1;
                group.bookings.push(b);
            }
        });
        return Array.from(groupedMap.values());
    }

    const renderAdminPage = (allCourses, allClasses, allBookedClasses, allBookedCourses, allUsers) => {
        const sortedClasses = allClasses.sort((a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day));
        const groupedClassBookings = groupBookings(allBookedClasses.sortedDocs || allBookedClasses, 'className');
        const groupedCourseBookings = groupBookings(allBookedCourses.sortedCourses || allBookedCourses, 'courseName');

        res.render("admin", {
            showButton: false,
            courseErrors,
            formData: { name, description, month, location, schedule, price },
            classOptions: sortedClasses,
            courseOptions: allCourses,
            groupedClassBookings,
            groupedCourseBookings,
            users: allUsers,
            isManagerOnly: req.user && req.user.role === 'Manager',
        });
    };

    if (Object.keys(courseErrors).length > 0) {
        return Promise.all([
            coursesDb.getAllCourses(),
            classesDb.getAllClasses(),
            bookedClassesDb.getAllBookedClasses(),
            bookedCoursesDb.getAllBookedCourses(),
            usersDb.getAllUsers()
        ]).then(([allCourses, allClasses, allBookedClasses, allBookedCourses, allUsers]) => {
            renderAdminPage(allCourses, allClasses, allBookedClasses, allBookedCourses, allUsers);
        });
    }

    coursesDb.addCourse(name, description, month, location, schedule, price)
        .then(() => Promise.all([
            coursesDb.getAllCourses(),
            classesDb.getAllClasses(),
            bookedClassesDb.getAllBookedClasses(),
            bookedCoursesDb.getAllBookedCourses(),
            usersDb.getAllUsers()
        ]))
        .then(([allCourses, allClasses, allBookedClasses, allBookedCourses, allUsers]) => {
            renderAdminPage(allCourses, allClasses, allBookedClasses, allBookedCourses, allUsers);
        })
        .catch(err => {
            console.error("Error adding course:", err);
            res.status(500).send("Failed to add course: " + err.message);
        });
};




// Update Course
exports.update_course = function (req, res) {
    console.log(req.body);

    const { id, name, description, month, location, schedule, price } = req.body;

    if (!id || !name || !description || !month || !location || !schedule || !price) {
        return res.status(400).send("All fields are required to update the course.");
    }

    // Get the course by ID first
    coursesDb.getCourseById(id)
        .then(courseData => {
            if (!courseData) {
                return res.status(404).send("Course not found.");
            }

            // Prepare the updated course data
            const updatedCourse = { name, description, month, location, schedule, price };

            // Now update the course with the new data
            return coursesDb.updateCourseById(id, updatedCourse);
        })
        .then(() => {
            // Redirect to the courses page after the update
            res.redirect("/admin");
        })
        .catch(err => {
            console.error("Error updating course:", err);
            res.status(500).send("Update failed: " + err.message);
        });
};

// Delete Course
exports.delete_course = function (req, res) {
    const courseId = req.body.id;
    if (!courseId) {
        return res.status(400).send("Course ID is required.");
    }
    coursesDb.deleteCourse(courseId)
        .then(numRemoved => {   
            if (numRemoved > 0) {
                res.redirect("/admin");
            } else {
                res.status(404).send("Course not found.");
            }
        })
        .catch(err => {
            console.error("Error deleting course:", err);
            res.status(500).send("Error deleting course.");
        });
};

// Add new User
exports.add_new_user = function (req, res) {
    console.log("Processing add_new_user controller");

    // Destructure values from the request body using consistent field names
    const { fname, lname, email, mobile, password, role } = req.body;

    // Validate input
    if (!fname || !lname || !email || !mobile || !password || !role) {
        return res.status(400).send("All fields are required to add a user.");
    }

    // Add user to the database (Ensure your database function matches the new field names)
    usersDb.addUser(fname, lname, email, mobile, password, role)
        .then(() => usersDb.getAllUsers())
        .then(users => {
            // Render the admin page with updated user options
            res.redirect("/admin");
        })
        .catch(err => {
            console.error("Error adding user:", err);
            res.status(500).send("Failed to add user: " + err.message);
        });
};

// Update User
exports.update_user = function (req, res) {
    const { id, fname, lname, email, mobile, password, role } = req.body;
    console.log("REQ.BODY:", req.body);
    if (!id || !fname || !lname || !email || !mobile || !role) {
      return res.status(400).send("All fields except password are required.");
    }
  
    const updateData = {
        fname,
        lname,
        email,
        mobile, 
        role
      };
  
    const completeUpdate = () => {
      usersDb.updateUserById(id, updateData)
        .then(() => usersDb.getAllUsers())
        .then(users => {
          // Remove password from users to keep it secure
          users.forEach(user => delete user.password);

          const organisers = users
            .filter(user => user.role === 'Admin' || user.role === 'Manager')
            .sort((a, b) => a.fname.localeCompare(b.fname));
  
            res.redirect("/admin");
        })
        .catch(err => {
          console.error("Error updating organiser:", err);
          res.status(500).send("Update failed: " + err.message);
        });
    };
  
    if (password && password.trim() !== '') {
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).send("Error hashing password");
        updateData.password = hashedPassword;
        completeUpdate();
      });
    } else {
      completeUpdate(); // No password to update
    }
};

// Delete User
exports.delete_user = function (req, res) {
    const userId = req.body.id; 
    console.log('Delete user - ID:', userId);

    if (!userId) {
        return res.status(400).send('User ID is required.');
    }

    usersDb.deleteUser(userId)
        .then(numRemoved => {
            if (numRemoved > 0) {
                // Fetch all users after deletion to ensure the dropdown is up-to-date
                return usersDb.getAllUsers();
            } else {
                return res.status(404).send('User not found.');
            }
        })
        .then(users => {
            // Remove sensitive fields (like password) from the user objects
            users.forEach(user => {
                delete user.password;  // Ensure passwords are not returned
            });

            // Render the updated view with the updated user list for the dropdown
            res.redirect("/admin");
        })
        .catch(err => {
            console.error('Error deleting user:', err);
            res.status(500).send('Error deleting user.');
        });
};

// Get User by ID
exports.get_user_by_id = function (req, res) {
    const userId = req.params.id;

    usersDb.getUserById(userId)
        .then(userData => {
            if (userData) {
                // Remove password before sending data to the frontend
                const { password, ...userWithoutPassword } = userData;
                res.json(userWithoutPassword);  // Send the user data excluding the password
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        })
        .catch(err => {
            console.error("Error fetching user data:", err);
            res.status(500).json({ error: 'Unable to fetch user' });
        });
};

// Show all class bookings
exports.show_class_bookings = function (req, res) {
    console.log("Fetching all bookings...");

    bookedDb.getAllBookings()
        .then(bookings => {
            console.log("Fetched bookings:", bookings);
            res.render("bookingsList", { title: "All Bookings", bookings });
        })
        .catch(err => {
            console.error("Error fetching bookings:", err);
            res.status(500).send("Error loading bookings.");
        });
};


// SHow course bookings
exports.show_course_bookings = function (req, res) {
    console.log("Fetching all bookings...");

    bookedCoursesDb.getAllBookings()
        .then(bookings => {
            console.log("Fetched bookings:", bookings);
            res.render("bookingsList", { title: "All Bookings", bookings });
        })
        .catch(err => {
            console.error("Error fetching bookings:", err);
            res.status(500).send("Error loading bookings.");
        });
};
