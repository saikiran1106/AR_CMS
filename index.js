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
    servers: [{
      url: `https://${process.env.VERCEL_URL}`, // This will be your Vercel URL in production
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
 *     description: Generate a dynamic HTML template for a 3D model viewer and a QR code pointing to it.
 *     tags: [Model Viewer]
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
  const { src, iosSrc } = req.body;
  try {
    const html = await ejs.renderFile('views/model-viewer.ejs', { src, iosSrc });
    const fileName = `model-${Date.now()}.html`; 
    const filePath = path.join(__dirname, 'public', fileName);
    fs.writeFileSync(filePath, html);
    const hostedUrl = `https://${process.env.VERCEL_URL}/public/${fileName}`;
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
