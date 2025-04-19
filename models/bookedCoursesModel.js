// models/bookedCoursesModel.js
const Nedb = require('nedb');

class BookedCourses {
    constructor(dbFilePath) {
        // Initialize the BookedCourses DB (could be in-memory or file-based)
        if (dbFilePath) {
            this.db = new Nedb({ filename: dbFilePath, autoload: true });
            console.log('BookedCourses DB connected to ' + dbFilePath);
        } else {
            this.db = new Nedb(); // In-memory database for BookedCourses
            console.log('BookedCourses DB initialized in memory');
        }
    }

    init() {
        console.log('BookedCourses database initialized');
    }

    // Add a new booking
    addCourseBooking(name, email, courseName, month, location, schedule, price) {
        // Helper function to format the date in dd/mm/yyyy format
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };
    
        return new Promise((resolve, reject) => {
            const booking = {
                name,
                email,
                courseName, // Use the course name passed from the form
                month,
                location,
                schedule,
                price,
                dateBooked: formatDate(new Date()) // Format the date to dd/mm/yyyy
            };
    
            // Debugging: Log the booking data that will be inserted
            console.log('Inserting booking into database:', booking);
    
            // Insert the booking into the BookedCourses DB
            this.db.insert(booking, (err, doc) => {
                if (err) {
                    console.error('Error inserting booking into the database:', err); // Detailed error logging
                    return reject(new Error('Error inserting booking: ' + err.message));
                } else {
                    console.log('Booking successfully inserted into database:', doc); // Log inserted doc for confirmation
                    return resolve(doc);
                }
            });
        });
    }
    
    // Check if a booking already exists for this user and course
    // Check if a booking already exists for this user and course
    getCourseBookingByUserAndCourse(email, courseName, month, location, schedule) {
        return new Promise((resolve, reject) => {
            console.log(`Checking booking for email: ${email}, course: ${courseName}, month: ${month}, month: ${location}, schedule: ${schedule}`);
            this.db.findOne({ email, courseName, month, location, schedule }, (err, doc) => {
                if (err) {
                    console.error("Database error:", err);
                    reject(err);
                } else {
                    console.log("Booking found:", doc);
                    resolve(doc); // If there's an existing booking, doc will not be null
                }
            });
        });
    }



    // Fetch all bookings
    getAllBookings() {
        return new Promise((resolve, reject) => {
            this.db.find({}, (err, docs) => {
                if (err) {
                    console.error('Error fetching bookings:', err); // Detailed error logging
                    return reject(new Error('Error fetching bookings: ' + err.message));
                } else {
                    return resolve(docs);
                }
            });
        });
    }


    getAllBookedCourses() {
        return new Promise((resolve, reject) => {
            this.db.find({}, (err, docs) => {
                if (err) {
                    console.error("Error fetching booked courses:", err);
                    reject(err);
                } else {
                    // Sort by Course Name, then Month, then Name
                    const sortedCourses = docs.sort((a, b) => {
                        // Course Name
                        const courseNameA = a.courseName.toLowerCase();
                        const courseNameB = b.courseName.toLowerCase();
                        if (courseNameA < courseNameB) return -1;
                        if (courseNameA > courseNameB) return 1;
    
                        // Month
                        const months = [
                            'january', 'february', 'march', 'april', 'may', 'june',
                            'july', 'august', 'september', 'october', 'november', 'december'
                        ];
                        const monthA = a.month.toLowerCase();
                        const monthB = b.month.toLowerCase();
                        if (months.indexOf(monthA) < months.indexOf(monthB)) return -1;
                        if (months.indexOf(monthA) > months.indexOf(monthB)) return 1;
    
                        // Name
                        const nameA = a.name.toLowerCase();
                        const nameB = b.name.toLowerCase();
                        if (nameA < nameB) return -1;
                        if (nameA > nameB) return 1;
    
                        return 0;
                    });
    
                    // Group the sortedCourses by course name and count
                    const groupedData = [];
                    let currentCourseName = null;
                    let count = 0;
    
                    sortedCourses.forEach(doc => {
                        if (doc.courseName !== currentCourseName) {
                            if (currentCourseName !== null) {
                                groupedData.push({
                                    courseName: currentCourseName,
                                    count: count
                                });
                            }
                            currentCourseName = doc.courseName;
                            count = 1;
                        } else {
                            count++;
                        }
                    });
    
                    if (currentCourseName !== null) {
                        groupedData.push({
                            courseName: currentCourseName,
                            count: count
                        });
                    }
    
                    resolve({ sortedCourses, groupedData });
                }
            });
        });
    }
    
}



module.exports = BookedCourses;
