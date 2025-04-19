const nedb = require('gray-nedb');  // Assuming you're using NeDB

class DanceFlow {
    constructor(dbFilePath) {
        if (dbFilePath) {
            this.db = new nedb({ filename: dbFilePath, autoload: true });
            console.log('DB connected to ' + dbFilePath);
        } else {
            this.db = new nedb();
            console.log('DB initialized in memory');
        }
    }

    // Initialization logic, such as seeding the database, goes here
    init() {
        console.log('Database initialized');
    }

    
    // Get all classes from the database
    getAllClasses() {
        return new Promise((resolve, reject) => {
            this.db.find({}, function (err, classes) {
                if (err) {
                    reject(err);
                } else {
                    resolve(classes);
                }
            });
        });
    }

    // Get class by ID
    getClassById(id) {
        return new Promise((resolve, reject) => {
            this.db.findOne({ _id: id }, (err, classData) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(classData);
                }
            });
        });
    }

    addClass(id, name, day, time, price) {
        // Create a class object
        var newClass = {
            _id: id,
            name: name,
            day: day,
            time: time,
            price: price
        };

        console.log('New class created:', newClass);

        // Insert the new class into the database
        this.db.insert(newClass, function (err, doc) {
            if (err) {
                console.log('Error inserting classes:', name);
            } else {
                console.log('Classes inserted into the database:', doc);
            }
        });
    }

    // Update class data by ID
    updateClassById(id, updatedData) {
        return new Promise((resolve, reject) => {
            this.db.update(
                { _id: id },               // Find by ID
                { $set: updatedData },     // Apply the updates
                { upsert: false },         // Do NOT insert if not found
                (err, numReplaced) => {
                    if (err) {
                        reject(err);
                    } else if (numReplaced === 0) {
                        reject(new Error('Class not found'));
                    } else {
                        resolve(numReplaced); // number of updated docs (should be 1)
                    }
                }
            );
        });
    }

    // Method to delete a class by its ID using NeDB
    deleteClass(id) {
        return new Promise((resolve, reject) => {
            this.db.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) {
                    return reject(err);  // Reject if there's an error
                }
                if (numRemoved === 0) {
                    return reject(new Error("No class found with the provided ID."));  // Reject if no class was deleted
                }
                resolve(numRemoved);  // Resolve with the number of deleted documents
            });
        });
    }

}
   
// Export the class correctly
module.exports = DanceFlow;
