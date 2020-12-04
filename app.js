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
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const reviewRouter = require('./routes/reviewRoutes');

// Initialize Express
const app = express();

// Heroku Redirects Requests To Proxies Internally, So We need to Trust Proxies
app.enable('trust proxy');

// MIDDLEWARES //////////////////////////////////////////////////////////////////
// Implement CORS - Set "Acces-Controll-Allow-Origin" Headers
/*
 * For Simple Request: GET and POST; Request From Every Origin To Every Route on our Server
 */
app.use(cors());

/*
 * For Simple Request: GET and POST; Request From Specified Origin To Every Route on our Server
 * Lets our API is on api.natours.com, then request from www.natours.com will be allowed only
 */
// app.use(
//   cors({
//     origin: 'https://www.natours.com/'
//   })
// );

/*
 * For Non-Simple Request: PUT, PATCH, DELETE etc; Request To Every Route on our Server
 */
/*
* options is also an http verb like GET and POST; Browsers, before sending the Non-Simple Requests, send the
* options request to confirm whether to send the actual request or not; Here we are allowing Non-Simple to all
* Routes on our servers
* /
app.options('*', cors());

/*
 * For Non-Simple Request: PUT, PATCH, DELETE etc; Request To Specific Route on our Server
 */
// app.options('/api/v1/tours/:id', cors())

// Set Templating Engine and Views Directory
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// To serve static files from given folder
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP Headers
app.use(helmet());

// Compress The Response Text Sent To The Client
app.use(compression());

// Limit the Requests per IP in a Specified Time
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000, // (1 hour) Time in milliseconds
//   message: 'Too many requests. Try after 1 hour!'
// });

// app.use('/api', limiter);

/*
 * Stripe Payment Confirmation
 */
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

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
      'ratingsQuantity',
    ],
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
app.all('*', function (req, res, next) {
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
