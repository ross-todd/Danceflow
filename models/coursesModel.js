const nedb = require('gray-nedb');

class Courses {
    constructor(dbFilePath) {
        if (dbFilePath) {
            this.db = new nedb({ filename: dbFilePath, autoload: true });
            console.log('Courses DB connected to ' + dbFilePath);
        } else {
            this.db = new nedb();
            console.log('Courses DB initialized in memory');
        }
    }

    // Optional init method
    init() {
        console.log('Courses database initialized');
    }

    // Get all courses
    getAllCourses() {
        return new Promise((resolve, reject) => {
            this.db.find({}, (err, courses) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(courses);
                }
            });
        });
    }

    // Get course by ID
    getCourseById(id) {
        return new Promise((resolve, reject) => {
            console.log('Looking for course with ID:', id);
            
            this.db.findOne({ _id: id }, (err, course) => {
                if (err) {
                    console.error('Database error when finding course:', err);
                    reject(err);
                } else {
                    console.log('Course found:', course);
                    // If course is null, try to find what's in the database
                    if (!course) {
                        this.db.find({}, (findErr, allDocs) => {
                            console.log('All available documents:', allDocs);
                        });
                    }
                    resolve(course);
                }
            });
        });
    }

    // Add a new course
    addCourse(name, description, month, location, schedule, price) {
        const newCourse = { name, description, month, location, schedule, price };
    
        console.log('New course created:', newCourse);
    
        return new Promise((resolve, reject) => {
            this.db.insert(newCourse, (err, doc) => {
                if (err) {
                    console.log('Error inserting course:', name);
                    reject(err);
                } else {
                    console.log('Course inserted into the database:', doc);
                    resolve(doc);
                }
            });
        });
    }
    

    // Update course by ID
    updateCourseById(id, updatedData) {
        return new Promise((resolve, reject) => {
            this.db.update(
                { _id: id },
                { $set: updatedData },
                { upsert: false },
                (err, numReplaced) => {
                    if (err) {
                        reject(err);
                    } else if (numReplaced === 0) {
                        reject(new Error('Course not found'));
                    } else {
                        resolve(numReplaced);
                    }
                }
            );
        });
    }

    // Delete a course by ID
    deleteCourse(id) {
        return new Promise((resolve, reject) => {
            this.db.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) {
                    return reject(err);
                }
                if (numRemoved === 0) {
                    return reject(new Error("No course found with the provided ID."));
                }
                resolve(numRemoved);
            });
        });
    }
}

module.exports = Courses;
