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

const PORT = process.env.PORT || 3000;

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
app.post('/create-model', async (req, res) => {
  const { src, iosSrc, name } = req.body; // Add 'name' to the destructured properties

  try {
    const html = await ejs.renderFile('views/model-viewer.ejs', { src, iosSrc });
    const sanitizedFileName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".html"; // Sanitize and construct the file name
    const filePath = path.join(__dirname, 'public', sanitizedFileName);
    fs.writeFileSync(filePath, html);
    const hostedUrl = `${process.env.PRODUCTION_URL}/public/${sanitizedFileName}`;
    QRCode.toDataURL(hostedUrl, (err, url) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error generating QR code');
      }
      res.json({ hostedUrl, qrCode: url });
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
app.get('/list-templates', (req, res) => {
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




// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
