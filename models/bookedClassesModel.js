const Nedb = require('nedb');

class BookedClasses {
    constructor(dbFilePath) {
        // Initialize the BookedClasses DB (could be in-memory or file-based)
        if (dbFilePath) {
            this.db = new Nedb({ filename: dbFilePath, autoload: true });
            console.log('BookedClasses DB connected to ' + dbFilePath);
        } else {
            this.db = new Nedb(); // In-memory database for BookedClasses
            console.log('BookedClasses DB initialized in memory');
        }
    }

    init() {
        console.log('BookedClasses database initialized');
    }

    addClassBooking(name, email, className, day, location, time, price) {
        // Helper function to format the date in dd/mm/yyyy format
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };
    
        return new Promise((resolve, reject) => {
            // Directly use the className passed in the booking form without querying the database
            const booking = {
                name,
                email,
                className, // Use the class name passed from the form
                day,
                location,
                time,
                price,
                dateBooked: formatDate(new Date()) // Format the date to dd/mm/yyyy
            };
    
            console.log('New booking to insert:', booking);
    
            // Insert the booking into the BookedClasses DB
            this.db.insert(booking, (err, doc) => {
                if (err) {
                    console.error('Error inserting booking:', err);  // Detailed error logging
                    return reject(new Error('Error inserting booking: ' + err.message));
                } else {
                    console.log('Booking successfully inserted:', doc);  // Log inserted doc for confirmation
                    return resolve(doc);
                }
            });
        });
    }

    // Check if a booking already exists for this user and class
    getClassBookingByUserAndClass(email, className, day, location, time) {
        return new Promise((resolve, reject) => {
            console.log(`Checking booking for email: ${email}, class: ${className}, day: ${day}, location: ${location}, time: ${time}`);
            this.db.findOne({ email, className, day, time }, (err, doc) => {
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

    getAllBookedClasses() {
        return new Promise((resolve, reject) => {
            console.log("Fetching all booked classes...");
            this.db.find({}, (err, docs) => {
                if (err) {
                    console.error("Error fetching booked classes:", err);
                    reject(err);
                } else {
                    console.log(`Fetched ${docs.length} booked classes`);
                    
                    // Sort by Class Name, then Day, then Name
                    const sortedDocs = docs.sort((a, b) => {
                        // Sort by Class Name (alphabetical)
                        const classNameA = a.className.toLowerCase();
                        const classNameB = b.className.toLowerCase();
                        if (classNameA < classNameB) return -1;
                        if (classNameA > classNameB) return 1;
    
                        // If class names are the same, sort by Day
                        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const dayA = a.day.toLowerCase();
                        const dayB = b.day.toLowerCase();
                        if (daysOfWeek.indexOf(dayA) < daysOfWeek.indexOf(dayB)) return -1;
                        if (daysOfWeek.indexOf(dayA) > daysOfWeek.indexOf(dayB)) return 1;
    
                        // If both class name and day are the same, sort by Name
                        const nameA = a.name.toLowerCase();
                        const nameB = b.name.toLowerCase();
                        if (nameA < nameB) return -1;
                        if (nameA > nameB) return 1;
    
                        return 0;  // If all are the same
                    });
    
                    console.log('Sorted booked classes:', sortedDocs);
    
                    // Group the sortedDocs by class name and calculate the count
                    const groupedData = [];
                    let currentClassName = null;
                    let count = 0;
    
                    sortedDocs.forEach(doc => {
                        if (doc.className !== currentClassName) {
                            if (currentClassName !== null) {
                                groupedData.push({
                                    className: currentClassName,
                                    count: count
                                });
                            }
                            currentClassName = doc.className;
                            count = 1; // Start counting the new class
                        } else {
                            count++;
                        }
                    });
    
                    // Push the last class's data
                    if (currentClassName !== null) {
                        groupedData.push({
                            className: currentClassName,
                            count: count
                        });
                    }
    
                    console.log('Grouped booked classes:', groupedData);
                    resolve({ sortedDocs, groupedData });
                }
            });
        });
    }
}

module.exports = BookedClasses;
