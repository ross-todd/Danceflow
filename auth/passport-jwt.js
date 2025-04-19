const passport = require("passport");
const passportJWT = require("passport-jwt");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Users = require("../models/usersModel"); // Import the Users class

const LocalStrategy = require("passport-local").Strategy;
const JWTStrategy = passportJWT.Strategy;

// Instantiate Users class with NeDB database path
const usersModel = new Users("users.db"); // Ensure this path is correct

module.exports = function (passport) {
  // Local Strategy for email/password login
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",  // field name for email
        passwordField: "password",  // field name for password
      },
      function (email, password, cb) {
        // Use findOne method on usersModel to get user by email
        usersModel.findOne({ email })
          .then((user) => {
            if (!user) {
              return cb(null, false, { message: "Incorrect email or password." });
            }
            // Compare the provided password with the stored hashed password
            bcrypt.compare(password, user.password, function (err, result) {
              if (err) return cb(err);
              if (result) {
                // Generate JWT token if authentication is successful
                const token = jwt.sign(
                  { _id: user._id, email: user.email, role: user.role }, // Directly pass the properties you need in the payload
                  process.env.JWT_SECRET,  // Secret key for signing JWT
                  { expiresIn: '20m' }  // Set expiration time for JWT
                );
                console.log('JWT Generated:', token);
                // Return the authenticated user and token
                return cb(null, user, { message: "Logged In Successfully", token });
              } else {
                return cb(null, false, { message: "Incorrect email or password." });
              }
            });
          })
          .catch((err) => cb(err)); // Catch any errors and pass to callback
      }
    )
  );

  // JWT Strategy for protected routes
  passport.use(new JWTStrategy({
    jwtFromRequest: cookieExtractor,  // This gets the JWT from the cookie
    secretOrKey: process.env.JWT_SECRET
  }, async (jwtPayload, done) => {
    console.log("JWT payload received:", jwtPayload);
    console.log('Looking for user with email:', jwtPayload.email);
      try {
          const user = await usersModel.findOne({ email: jwtPayload.email });
  
          if (user) {
              return done(null, user);  // If user found, pass to next step
          } else {
              return done(null, false);  // If user not found, return false
          }
      } catch (err) {
          return done(err, false);  // Pass error if occurred
      }
  }));
  
};

// Optionally, you can use a cookie extractor for JWT
const cookieExtractor = req => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt'];
  }
  return token;
};
