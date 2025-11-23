const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const dispatchGuideRoutes = require('./routes/dispatchGuideRoutes');
const externalDecommissionActRoutes = require('./routes/externalDecommissionActRoutes');
const activeDirectoryRoutes = require('./routes/activeDirectoryRoutes');
const productModelRoutes = require('./routes/productModelRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-models', productModelRoutes);
app.use('/api/dispatch-guides', dispatchGuideRoutes);
app.use('/api/external-decommission-acts', externalDecommissionActRoutes);
app.use('/api/ad', activeDirectoryRoutes);
app.use('/api/users', userRoutes);

const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const shouldServeFrontend = process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath);

if (shouldServeFrontend) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }

    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
