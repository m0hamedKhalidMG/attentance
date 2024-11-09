const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const authApiRouter = require("./routes/auth");
const errorHandlers = require("./handlers/errorHandlers");
const { isValidToken } = require("./controllers/authController");
require("dotenv").config({ path: ".env" });
const cors = require("cors");
const promisify = require("es6-promisify");
const multer = require('multer');
const Attendance =require('./models/attendancechild.js')
const Parent =require('./models/Parent.js')
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env" });
const jwt = require("jsonwebtoken");

// Create our Express app
const app = express();
const server = http.createServer(app);
app.use(cors()); // Enable CORS for all routes

// Initialize Pusher and get the io instance


// Middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions configuration
app.use(
  session({
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE }),
  })
);

// Middleware to pass variables to templates and requests
app.use((req, res, next) => {
  res.locals.admin = req.admin || null;
  res.locals.currentPath = req.path;
  next();
});

// Promisify some callback-based APIs
app.use((req, res, next) => {
  req.login = promisify(req.login, req);
  next();
});

// CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PATCH,PUT,POST,DELETE");
  res.header("Access-Control-Expose-Headers", "Content-Length");
  res.header(
    "Access-Control-Allow-Headers",
    "Accept, Authorization,x-auth-token, Content-Type, X-Requested-With, Range"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  } else {
    return next();
  }
});

app.post('/attendance', async (req, res) => {
  const { parentName, childIdentifier, date, status, entryTime, exitTime } = req.body;

  try {
    // Find parent by name
    const parent = await Parent.findOne({ parentName });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    // Find the child by identifier within the parent's children array
    const child = parent.children.find(child => child.identifier === childIdentifier);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Create a new attendance record for the specified child
    const newAttendance = new Attendance({
      parentId: parent._id,
      childId: child._id, // Link to the specific child
      date,
      status,
      entryTime,
      exitTime,
    });

    // Save the attendance record
    await newAttendance.save();

    // Optionally, you can push the attendance record to the parent's attendances array
    parent.attendances.push(newAttendance._id);
    await parent.save();

    res.status(201).json({ message: 'Attendance added successfully', attendance: newAttendance });
  } catch (error) {
    console.error('Error adding attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// API routes
app.use("/api/v1", authApiRouter);
app.post('/api/register', async (req, res) => {
  const { parentName, password, children } = req.body;

  // Validate the request
  if (!parentName || !password || !children || children.length === 0) {
    return res.status(400).send('All fields are required.');
  }

  try {
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new parent entry
    const newParent = new Parent({
      parentName,
      password: hashedPassword,
      children,
    });

    // Save the entry to the database
    await newParent.save();

    res.status(201).json({
      message: 'Registration successful',
      parentName: newParent.parentName,
    });
  } catch (error) {
    console.error('Error saving to the database:', error);
    res.status(500).send('An error occurred while registering.');
  }
});

app.use(bodyParser.json());

// Login route
app.post('/api/login', async (req, res) => {
  const { parentName, password } = req.body;

  try {
    // Find the parent document by parentName
    const parent = await Parent.findOne({ parentName });
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    // Check the password
    const isPasswordValid = await bcrypt.compare(password, parent.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate a token
    const token = jwt.sign({ id: parent._id },       process.env.JWT_SECRET
      , { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token ,parentId:parent._id});
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});


app.get('/attendance/:parentId', async (req, res) => {
  const { parentId } = req.params;

  try {
    // Find the parent by ID
    const parent = await Parent.findById(parentId).populate('attendances');
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    // Fetch all attendance records associated with the parent
    const attendances = await Attendance.find({ parentId: parent._id });

    if (attendances.length === 0) {
      return res.status(404).json({ message: 'No attendance records found for this parent' });
    }

    // Prepare the response with attendance and child details
    const response = {
      parentName: parent.parentName,
      children: parent.children,
      attendances: attendances,
    };

    // Return the response
    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving attendance records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/parent/:parentId/change-password', async (req, res) => {
  try {
    const { parentId } = req.params;
    const { newPassword } = req.body;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة مطلوبة' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const parent = await Parent.findByIdAndUpdate(
      parentId,
      { password: hashedPassword },
      { new: true }
    );

    if (!parent) {
      return res.status(404).json({ message: 'لم يتم العثور على المستخدم' });
    }

    res.status(200).json({ message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// Handle 404 errors
app.use(errorHandlers.notFound);

// Development error handler
if (app.get("env") === "development") {
  app.use(errorHandlers.developmentErrors);
}

// Production error handler
app.use(errorHandlers.productionErrors);

// Start the server

module.exports = app;