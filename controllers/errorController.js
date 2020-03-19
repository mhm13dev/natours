const AppError = require('./../utils/AppError');

function handleCastErrorDB(err) {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
}
function handleDuplicateErrorDB(err) {
  const message = `Duplicate Field Value: "${err.keyValue.name}". Please use another one!`;
  return new AppError(message, 400);
}

function handleValidationErrorDB(err) {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `${errors.join('. ')}`;
  return new AppError(message, 400);
}

function handleJWTError() {
  return new AppError('Invalid Token. Please Login Again', 401);
}

function handleTokenExpiredError() {
  return new AppError('Your Token has expired. Please Login Again', 401);
}
function sendErrorDev(req, res, err) {
  // Log the Error
  console.error(err);

  // For API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // For Rendered Website
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    message: err.message
  });
}

function sendErrorProd(req, res, err) {
  // For API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    //Log the error for hosting platform
    console.error(err);

    // Send Response
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  // For Rendered Website
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      status: err.status,
      message: err.message
    });
  }
  //Log the error for hosting platform
  console.error(err);

  // Send Response
  return res.status(500).render('error', {
    status: 'error',
    message: 'Something went very wrong!'
  });
}
// Global Error Handler
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(req, res, err);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    if (!err.isOperational) {
      if (err.name === 'CastError') error = handleCastErrorDB(error);
      if (err.code === 11000) error = handleDuplicateErrorDB(error);
      if (err.name === 'ValidationError')
        error = handleValidationErrorDB(error);
      if (err.name === 'JsonWebTokenError') error = handleJWTError();
      if (err.name === 'TokenExpiredError') error = handleTokenExpiredError();
      sendErrorProd(req, res, error);
    } else {
      sendErrorProd(req, res, err);
    }
  }
};
