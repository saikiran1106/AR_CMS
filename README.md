# QRAR API README

## Project Overview

QRAR API allows users to upload GLB 3D models and generates a Google ModelViewer web link for showcasing eCommerce products in 3D.

## Features

- **GLB Model Upload**: Upload GLB 3D models.
- **Link Generation**: Receive a Google ModelViewer web link for the uploaded model.

## Getting Started

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/saikiran1106/AR_CMS.git
    cd AR_CMS
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Set up environment variables in a `.env` file:
    ```plaintext
    PORT=3000
    AWS_ACCESS_KEY_ID=your_aws_access_key
    AWS_SECRET_ACCESS_KEY=your_aws_secret_key
    S3_BUCKET_NAME=your_s3_bucket_name
    BASE_URL=https://yourdomain.com
    ```

### Running the API

Start the development server:
```bash
npm start
```

## API Endpoints

### Upload GLB Model

- **Endpoint**: `/upload`
- **Method**: `POST`
- **Description**: Upload a GLB model and get a Google ModelViewer link.

**Example**:
```curl
curl -X POST http://localhost:3000/upload -F 'file=@path/to/your/model.glb'
```

**Response**:
```json
{
  "url": "https://yourdomain.com/model-viewer/your-model-id"
}
```


---

**Note**: Replace placeholder values with your actual configuration values.
