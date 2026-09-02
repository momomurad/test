const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({
    app: 'sample-node-app',
    message: 'Hello from Node.js running on Kubernetes!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'sample-node-app'
  });
});

app.listen(PORT, () => {
  console.log(`Application started on port ${PORT}`);
});
