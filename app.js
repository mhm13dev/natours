const path = require('path');
const express = require('express');
const queryParser = require('express-query-int');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const reviewRouter = require('./routes/reviewRoutes');

// Initialize Express
const app = express();

// MIDDLEWARES //////////////////////////////////////////////////////////////////

// Set Templating Engine and Views Directory
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// To serve static files from given folder
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP Headers
app.use(helmet());

// Limit the Requests per IP in a Specified Time
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // (1 hour) Time in milliseconds
  message: 'Too many requests. Try after 1 hour!'
});

app.use('/api', limiter);

if (process.env.NODE_ENV === 'development') {
  // To Log Data about Request to the console
  app.use(morgan('dev'));
}
// To Parse the Request Body
app.use(express.json({ limit: '10kb' })); // Limits the body data to size of 10kb

// To Parse FORM Data
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// To Parse The Cookie
app.use(cookieParser());
// app.use(function(req, res, next) {
//   console.log(req.cookies);
//   next();
// });
// Sanitize req.body, params and query. Basically Removes Dollars Sign from User inputs
app.use(mongoSanitize());

// Protect from XSS - Cross Site Scripting. Replace html code with html entities
app.use(xssClean());

// To Parse the URL Query as Object
app.use(queryParser());

// Prevent Parameter Pollution - i.e duplicate parameters like sort=duration&sort=price
app.use(
  hpp({
    whitelist: [
      'duration',
      'price',
      'maxGroupSize',
      'difficulty',
      'ratingsAverage',
      'ratingsQuantity'
    ]
  })
);

// ROUTING //////////////////////////////////////////////////////////////////
// Routers Mounting
app.use('/', viewRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/users', userRouter);

// For Unhandled Routes
app.all('*', function(req, res, next) {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `The ${req.originalUrl} does not exist on this Server!`
  // });

  // const error = new Error(`${req.originalUrl} Does Not Exist!`);
  // error.statusCode = 404;
  // error.status = 'fail';
  next(new AppError(`${req.originalUrl} Does Not Exist!`, 404));
});

// GLOBAL ERROR HANDLER MIDDLEWARE //////////////////////////////////////////////////////////////////
app.use(globalErrorHandler);

module.exports = app;
