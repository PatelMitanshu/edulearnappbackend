const mongoose = require('mongoose');
require('dotenv').config();

console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('Full MONGODB_URI:', process.env.MONGODB_URI);

const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app';
console.log('Using connection string:', connectionString);

mongoose.connect(connectionString).then(() => {
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  mongoose.disconnect();
}).catch(err => {
  console.error('Connection error:', err);
});
