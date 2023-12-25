// server.js
const express = require('express');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const ejs = require('ejs');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const fs = require('fs');
const app = express();
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Your user model
const PORT = process.env.PORT || 3000;
require('dotenv').config();
const secretKey = process.env.SECRET_KEY;
// Now access the MONGODB_URI from the process.env
const uri = process.env.MONGODB_URI;
const argon2 = require('argon2');


// Define a schema for the Contact form responses
const responseSchema = new mongoose.Schema({
name: String,
email: String,
message: String,
createdAt: {
type: Date,
default: Date.now,
},
});

// Create a model from the schema
const Response = mongoose.model('Response', responseSchema);

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    // If there isn't any token, send a 401 Unauthorized response
    return res.status(401).send({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      // If the token is not valid, also send a 401 Unauthorized response
      return res.status(401).send({ error: 'Unauthorized' });
    }
    req.user = user;
    next(); // Proceed to the next middleware or route handler
  });
}



app.use('/public', express.static(path.join(__dirname, 'public')));

// BodyParser Middleware
app.use(bodyParser.json());
app.use(cors())

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '3D Model Viewer API',
      version: '1.0.0',
      description: 'An API to create 3D model viewers with dynamic HTML templates and generate QR codes.',
    },
    servers: [{
      url: process.env.PRODUCTION_URL || 'http://localhost:3000', // Dynamic URL
    }],
    components: {
      securitySchemes: {
        bearerAuth: {  // Name of the security scheme, can be referenced in the security section of the endpoint documentation
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",  // Optional, can be omitted if not needed
        }
      }
    },
    // ... other settings ...
  },
  apis: ['./index.js'], // Path to the API docs
};


const swaggerSpec = swaggerJsDoc(swaggerOptions);

// Serve Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// EJS View Engine for rendering HTML
app.set('view engine', 'ejs');

/**
 * @openapi
 * /create-model:
 *   post:
 *     summary: Create a 3D model viewer
 *     description: Generate a dynamic HTML template for a 3D model viewer, name it, and generate a QR code pointing to it.
 *     tags: [Model Viewer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - src
 *               - name
 *             properties:
 *               src:
 *                 type: string
 *                 description: The source URL of the 3D model
 *               iosSrc:
 *                 type: string
 *                 description: The source URL for the iOS model (optional)
 *               name:
 *                 type: string
 *                 description: The desired name for the 3D model template
 *     responses:
 *       200:
 *         description: Successfully generated QR code and link to the 3D model viewer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hostedUrl:
 *                   type: string
 *                   description: The hosted URL to the 3D model viewer
 *                 qrCode:
 *                   type: string
 *                   description: The generated QR code data URL
 *       500:
 *         description: Server error or unable to process the request
 */
app.post('/create-model', authenticateToken, async (req, res) => {
  const { src, iosSrc, name } = req.body;

  try {
    // Generate unique identifier for the template
    const templateId = new mongoose.Types.ObjectId();
    const sanitizedFileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${templateId}.html`;
    
    // Store or associate this templateId and filename with the authenticated user in the database
    // This step depends on how you've structured your User model and related data.

    const html = await ejs.renderFile('views/model-viewer.ejs', { src, iosSrc , modelName: name });
    const filePath = path.join(__dirname, 'public', sanitizedFileName);
    fs.writeFileSync(filePath, html);

    // Generate the URL that points to the authenticated route for accessing this template
    const hostedUrl = `${process.env.PRODUCTION_URL || 'http://localhost:3000'}/template/${sanitizedFileName}`;

    QRCode.toDataURL(hostedUrl, (err, qrCodeUrl) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error generating QR code');
      }
      res.json({ hostedUrl, qrCode: qrCodeUrl });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing request');
  }
});


/**
 * @openapi
 * /delete-template/{fileName}:
 *   delete:
 *     summary: Delete a saved HTML template
 *     description: Delete a saved HTML template file by name without considering the file extension
 *     tags: [Model Viewer]
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         description: The base file name of the HTML template to delete without extension
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted the template
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
app.delete('/delete-template/:fileName', (req, res) => {
  const { fileName } = req.params;
  const dirPath = path.join(__dirname, 'public');
  let fileDeleted = false;

  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading the directory');
    }

    // Filter and find the file that matches the fileName regardless of its extension
    const fileToBeDeleted = files.find(file => file.split('.')[0] === fileName);
    
    if (!fileToBeDeleted) {
      return res.status(404).send('Template not found');
    }

    // Define the full path to the file and delete it
    const fullPathToFile = path.join(dirPath, fileToBeDeleted);
    try {
      fs.unlinkSync(fullPathToFile);
      fileDeleted = true;
    } catch (err) {
      console.error(err);
      return res.status(500).send('Error deleting the file');
    }

    if (fileDeleted) {
      res.status(200).send('Successfully deleted');
    }
  });
});

/**
 * @openapi
 * /list-templates:
 *   get:
 *     summary: List all saved HTML templates
 *     description: Retrieve a list of all saved HTML templates in the application
 *     tags: [Model Viewer]
 *     responses:
 *       200:
 *         description: A list of saved templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: The file names of all saved templates
 *       500:
 *         description: Error reading templates
 */
app.get('/list-templates', authenticateToken , (req, res) => {
  const dirPath = path.join(__dirname, 'public');

  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading the directory');
    }

    // Optionally filter for HTML files or specific naming patterns here
    const templates = files.filter(file => file.endsWith('.html')); // Adjust as needed

    res.status(200).json({ templates });
  });
});



// Swagger docs for /signup
/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       500:
 *         description: Error occurred
 */
app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Hash password using argon2
    const hash = await argon2.hash(password);
    const user = new User({ username, password: hash });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Swagger docs for /login
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT for the authenticated user
 *       401:
 *         description: Authentication failed
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user) {
    // Verify password using argon2
    try {
      if (await argon2.verify(user.password, password)) {
        // Create JWT token
        const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
        res.status(200).json({ token: token });
      } else {
        res.status(401).json({ message: 'Authentication failed' });
      }
    } catch (err) {
      res.status(401).json({ message: 'Authentication failed' });
    }
  } else {
    res.status(401).json({ message: 'Authentication failed' });
  }
});


/**
 * @openapi
 * /template/{templateId}:
 *   get:
 *     summary: Access a saved HTML template
 *     description: Retrieve a saved HTML template by its ID, ensuring the user is authenticated
 *     tags: [Template]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         description: The unique identifier of the HTML template
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: HTML template file served successfully
 *       404:
 *         description: Template not found
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
app.get('/template/:filename' , (req, res) => {
    const { filename } = req.params;

    const filePath = path.join(__dirname, 'public', filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Template not found');
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Index.html'));
});


/**
 * @openapi
 * /submit-form:
 *   post:
 *     tags:
 *       - Responses
 *     summary: Record a response from the Contact Us form
 *     requestBody:
 *       description: Data for the Contact Us form
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               message:
 *                 type: string
 *                 example: Hello, I have a query.
 *     responses:
 *       200:
 *         description: Response recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Response recorded successfully!
 *       500:
 *         description: Error recording response
 */
app.post('/submit-form', async (req, res) => {
try {
const newResponse = new Response(req.body);
await newResponse.save();
res.status(200).json({ message: 'Response recorded successfully!' });
} catch (error) {
console.error(error);
res.status(500).json({ message: 'Error recording response' });
}
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
