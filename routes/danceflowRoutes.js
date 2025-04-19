const express = require('express');
const router = express.Router();
const passport = require('passport');
const danceflowControllers = require('../controllers/danceflowControllers');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Middleware
router.use(cookieParser());

// Global middleware to expose login state in all views
router.use((req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    res.locals.isLoggedIn = false;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      res.locals.isLoggedIn = false;
    } else {
      res.locals.isLoggedIn = true;
      res.locals.user = decoded;
      res.locals.showOrganisersSection = decoded.role === 'Manager';

      try {
        res.locals.showAdminButton = ['Admin', 'Manager'].includes(decoded.role);
      } catch (error) {
        res.locals.showAdminButton = false;
        console.error('Auth check error:', error);
      }
    }
    next();
  });
});

// 🔐 JWT Auth Middleware to protect routes
const jwtAuthMiddleware = (req, res, next) => {
  const token = req.cookies.jwt;
  console.log("JWT Auth Middleware hit for path:", req.path);
  console.log("Token found:", token ? "Yes" : "No");

  if (!token) {
    res.locals.isLoggedIn = false;

    if (['/process-class-bookings', '/process-course-bookings'].includes(req.path)) {
      return res.status(403).json({ success: false, message: "You must be logged in to book!" });
    }

    return res.redirect('/login');
  }

  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (!user) {
      if (['/process-class-bookings', '/process-course-bookings'].includes(req.path)) {
        return res.status(403).json({ success: false, message: "Invalid or expired token. Please log in again." });
      }

      return res.redirect('/login');
    }

    req.user = user;
    res.locals.isLoggedIn = true;
    res.locals.user = user;

    console.log("User authenticated with role:", user.role);
    next();
  })(req, res, next);
};

// 🔒 Role-based access control
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send("Access Denied: Insufficient role");
    }
    next();
  };
};



// === Public Routes ===
router.get('/', danceflowControllers.show_home_page);
router.get('/about', danceflowControllers.show_about_page);
router.get('/classes', danceflowControllers.show_classes_page);
router.get('/courses', danceflowControllers.show_courses_page);

// === Auth Routes ===
router.get('/login', danceflowControllers.show_login_page);
router.post('/login', danceflowControllers.process_login);
router.get('/register', danceflowControllers.show_register_page);
router.post('/register', danceflowControllers.process_register);
router.get('/logout', danceflowControllers.logout);

// === Admin & Manager Routes ===
router.get('/admin', jwtAuthMiddleware, checkRole('Admin', 'Manager'), danceflowControllers.show_admin_page);

// === Admin-only Actions ===
router.get('/admin/getClass/:id', jwtAuthMiddleware, danceflowControllers.get_class_by_id);
router.post('/admin/deleteClass', jwtAuthMiddleware, danceflowControllers.delete_class);
router.post('/admin/addClass', jwtAuthMiddleware, danceflowControllers.add_new_class);
router.post('/admin/updateClass', jwtAuthMiddleware, danceflowControllers.update_class);
router.post('/admin/deleteCourse', jwtAuthMiddleware, danceflowControllers.delete_course);
router.post('/admin/addCourse', jwtAuthMiddleware, danceflowControllers.add_new_course);
router.post('/admin/updateCourse', jwtAuthMiddleware, danceflowControllers.update_course);
router.post('/admin/addOrganiser', jwtAuthMiddleware, danceflowControllers.add_new_user);
router.post('/admin/updateOrganiser', jwtAuthMiddleware, danceflowControllers.update_user);
router.post('/admin/deleteOrganiser', jwtAuthMiddleware, danceflowControllers.delete_user);

// === Public API Routes (still need auth) ===
router.get('/getClass/:id', jwtAuthMiddleware, danceflowControllers.get_class_by_id);
router.get('/class/:id', jwtAuthMiddleware, danceflowControllers.get_class_by_id);
router.get('/course/:id', jwtAuthMiddleware, danceflowControllers.get_course_by_id);
router.get('/organiser/:id', jwtAuthMiddleware, danceflowControllers.get_user_by_id);

// === Bookings ===
router.get('/bookClass/:classId', jwtAuthMiddleware, checkRole('Public'), danceflowControllers.show_class_booking_form);
router.post('/process-class-bookings', jwtAuthMiddleware, checkRole('Public'), danceflowControllers.process_class_bookings);
router.get('/allClassBookings', jwtAuthMiddleware, danceflowControllers.show_class_bookings); 
router.get('/bookCourse/:courseId', jwtAuthMiddleware, checkRole('Public'), danceflowControllers.show_course_booking_form);
router.post('/process-course-bookings', jwtAuthMiddleware, checkRole('Public'), danceflowControllers.process_course_bookings);

// === Error Handling ===
router.use((req, res) => {
  res.status(404).type('text/plain').send('404 Not Found.');
});

router.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text/plain').send('Internal Server Error.');
});

module.exports = router;
