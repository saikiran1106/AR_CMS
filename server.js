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

const PORT = process.env.PORT || 3000;



app.use('/public', express.static(path.join(__dirname, 'public')));


// BodyParser Middleware
app.use(bodyParser.json());

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '3D Model Viewer API',
      version: '1.0.0',
      description: 'An API to create 3D model viewers with dynamic HTML templates and generate QR codes.',
    },
    servers: [
      {
        url: 'http://localhost:3000', // change this to your server URL in production
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./server.js'],
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
 *     description: Generate a dynamic HTML template for a 3D model viewer and a QR code pointing to it.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - src
 *             properties:
 *               src:
 *                 type: string
 *                 description: The source URL of the 3D model
 *               iosSrc:
 *                 type: string
 *                 description: The source URL for the iOS model (optional)
 *     responses:
 *       200:
 *         description: A QR code and link to the 3D model viewer
 *       500:
 *         description: Error message
 */
app.post('/create-model', async (req, res) => {
  const { src, iosSrc } = req.body;
  try {
    // Step 1: Render HTML with EJS
    const html = await ejs.renderFile('views/model-viewer.ejs', { src, iosSrc });

    // Step 2: Define path for the new file and save it
    const fileName = `model-${Date.now()}.html`; // Ensure unique file name
    const filePath = path.join(__dirname, 'public', fileName);

    fs.writeFileSync(filePath, html); // Synchronously write file for simplicity

    // Step 3: Create hosted URL
     // Use Vercel environment variable for the hosted URL
    const hostedUrl = `https://${process.env.VERCEL_URL}/public/${fileName}`;

    // Step 4: Generate QR code
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


// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

