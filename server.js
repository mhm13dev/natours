/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Global Error Handlers FOr Node
process.on('uncaughtException', err => {
  console.error('Uncaught Exception! Shutting Down Application...');
  console.error(`${err.name}: ${err.message}`);
  console.error(err);
  process.exit(1);
});

// Set a Path To File Containing Environment Variables
dotenv.config({
  path: `${__dirname}/config.env`
});

const app = require('./app');

// DATABASE STUFF //////////////////////////////////////////////////
// Database String
const DB = process.env.DATABASE_URI.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
// const DBLocal = process.env.DATABASE_URI_LOCAL;

// Connect The Database
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('Database Connection Successful!'));

// SERVER LISTEN //////////////////////////////////////////////
const port = 3000;
const server = app.listen(port, () => {
  console.log(`App is Listening at Port: ${port}`);
});

// Unhandled Rejection ERRORS
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection! Shutting Down Application...');
  console.error(`${err.name}: ${err.message}`);
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
