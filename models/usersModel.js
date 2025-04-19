const bcrypt = require('bcrypt');
const nedb = require('gray-nedb');

class Users {
    constructor(dbFilePath) {
        if (dbFilePath) {
            this.db = new nedb({ filename: dbFilePath, autoload: true });
            console.log('Users DB connected to ' + dbFilePath);
        } else {
            this.db = new nedb();
            console.log('Users DB initialized in memory');
        }
    }

    init() {
        console.log('Users database initialized');
    }

    addUser(fname, lname, email, mobile, password, role = 'Public') {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) return reject(err);
    
                const normalisedEmail = email.trim().toLowerCase();  // <-- Normalise here
                const newUser = { fname, lname, email: normalisedEmail, mobile, password: hashedPassword, role };
    
                this.db.insert(newUser, (err, doc) => {
                    if (err) return reject(err);
                    return resolve(doc);
                });
            });
        });
    }
    
    

    checkUsersDetails(email, password) {
        return new Promise((resolve, reject) => {
            const normalisedEmail = email.trim().toLowerCase();
        
            this.db.findOne({ email: normalisedEmail }, (err, user) => {
                if (err) return reject(err); // Reject if there's a database error
                if (!user) return resolve({ error: "No matching user found" }); // Return error if user not found
        
                const now = Date.now();
        
                // If user is locked out
                if (user.lockedUntil && now < user.lockedUntil) {
                    return resolve({ locked: true, unlockTime: user.lockedUntil });
                }
        
                bcrypt.compare(password, user.password, (err, match) => {
                    if (err) return reject(err); // Reject on bcrypt error
        
                    if (match) {
                        // Successful login: Reset loginAttempts and lockedUntil
                        this.db.update({ email: normalisedEmail }, { $set: { loginAttempts: 0, lockedUntil: null } });
                        return resolve({ user }); // Return user info on success
                    } else {
                        const attempts = (user.loginAttempts || 0) + 1;
                        const update = { loginAttempts: attempts };
        
                        if (attempts >= 3) {
                            update.lockedUntil = now + 15 * 60 * 1000; // Lock the account for 15 minutes
                        }
        
                        this.db.update({ email: normalisedEmail }, { $set: update });
                        return resolve({ error: "Invalid email or password" }); // Incorrect password
                    }
                });
            });
        });
    }
    
    
    
    
    
    

    checkEmailOrMobile(email, mobile) {
        return new Promise((resolve, reject) => {
            this.db.find({ $or: [{ email }, { mobile }] }, (err, docs) => {
                if (err) {
                    return reject(err);
                }
                return resolve(docs);  // docs will be empty if no match is found
            });
        });
    }

    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.find({}, (err, users) => {
                if (err) {
                    return reject(err);
                }
                console.log("Users fetched from the database:", users);
                users.sort((a, b) => a.role.localeCompare(b.role)); 
                return resolve(users);
            });
        });
    }


    // Find user by email
    findOne(query) {
        return new Promise((resolve, reject) => {
          this.db.find(query, function (err, docs) {
            if (err) {
              reject(err);
            } else {
              const user = docs.length > 0 ? docs[0] : null;
              console.log("Found user:", user);
              resolve(user);
            }
          });
        });
      }
      


    updateUserById(id, updatedData) {
        return new Promise((resolve, reject) => {
        this.db.update(
            { _id: id },                // Lookup by ID
            { $set: updatedData },      // Apply the updates
            { upsert: false },          // Don't insert if not found
            (err, numReplaced) => {
            if (err) {
                console.error("Error during update:", err);
                reject(err);
            } else {
                console.log(`Number of records updated: ${numReplaced}`);
                if (numReplaced === 0) {
                console.log(`No user found with ID: ${id}`);
                reject(new Error('User not found'));
                } else {
                resolve(numReplaced); // Expected: 1
                }
            }
            }
        );
        });
    }
  

    updateOrganiserById(id, updatedData) {
        return new Promise((resolve, reject) => {
          this.db.update({ _id: id }, { $set: updatedData }, { upsert: false }, (err, numReplaced) => {
            if (err) reject(err);
            else if (numReplaced === 0) reject(new Error('User not found'));
            else resolve(numReplaced);
          });
        });
      }

      // Get user by ID
    getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.findOne({ _id: id }, (err, userData) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(userData);
                }
            });
        });
    }


    deleteUser(id) {
        return new Promise((resolve, reject) => {
            this.db.remove({ _id: id }, {}, (err, numRemoved) => {
                if (err) {
                    return reject(err);  // Reject if there's an error
                }
                if (numRemoved === 0) {
                    return reject(new Error("No user found with the provided ID."));  // Reject if no user was deleted
                }
                resolve(numRemoved);  // Resolve with the number of deleted users
            });
        });
    }
    




}

module.exports = Users;
