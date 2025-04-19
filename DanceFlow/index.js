require('dotenv').config();
const express = require('express');
const mustacheExpress = require('mustache-express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const app = express();

// All console logs and errors hve been redirected to a server.log file

// Save original console methods BEFORE overriding
const originalLog = console.log;

// Create a writable stream for logs
const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });

// Override console.log (no console output)
console.log = (...args) => {
  logStream.write(`[LOG ${new Date().toISOString()}] ${args.join(' ')}\n`);
};

// Override console.error (no console output)
console.error = (...args) => {
  logStream.write(`[ERROR ${new Date().toISOString()}] ${args.join(' ')}\n`);
};


// Middleware to parse incoming request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

require('./auth/passport-jwt')(passport); // Passport JWT setup
app.use(passport.initialize());
app.use(cookieParser());

// Static files
app.use('/images', express.static('public/images'));
const public = path.join(__dirname, 'public');
app.use(express.static(public));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} request to ${req.url}`);
  next();
});

// Mustache setup
app.engine('mustache', mustacheExpress(path.join(__dirname, 'views/partials')));
app.set('view engine', 'mustache');
app.set("partials", __dirname + "/views/partials");
app.set('views', path.join(__dirname, 'views'));


// JWT Authentication Middleware
const jwtAuthMiddleware = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err); // Pass any error to the error handler
    }

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' }); // If user is not authenticated
    }

    req.user = user; // Attach user to the request
    next(); // Continue to the next middleware or controller
  })(req, res, next);
};

// Import the routes from 'danceflowRoutes' file
const router = require('./routes/danceflowRoutes');
app.use('/', router);

// Apply JWT middleware to protect /admin route
app.get('/admin', jwtAuthMiddleware, (req, res) => {
  res.render('admin', { title: 'Admin - DanceFlow', user: req.user });
});

// Error handling middleware
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  originalLog(`Server running on http://localhost:${PORT}`);
});
