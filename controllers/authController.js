const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const Email = require('./../utils/email');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
}

function createSendToken(user, statusCode, res, options = {}) {
  const token = signToken(user._id);

  const sendObj = {
    status: 'success',
    token
  };

  // Check if data prop exist
  if (!sendObj.data) {
    sendObj.data = {};
  }

  // Only Send Password in Development
  if (process.env.NODE_ENV === 'production') {
    user.password = undefined;
  }

  // Only send user when its needed
  if (options.sendUser === true) {
    sendObj.data.user = user;
  }

  // Check if data property in sendObj is empty
  if (Object.keys(sendObj.data).length === 0) sendObj.data = undefined;

  // Set Cookies Options
  const cookieOptions = {
    httpOnly: true, // So that Cookie can not be accessed or modified by the client/browser
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    )
  };

  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // So that cookie is only sent over https

  // Send Cookies
  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json(sendObj);
}
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  // Send Email
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res, {
    sendUser: true
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check If the Email and Password Exist in the Input
  if (!email || !password) {
    return next(new AppError('Please Provide Email and Password!', 400));
  }

  // Check if a user with provided email exists
  const user = await User.findOne({ email }).select('+password');

  // Compare Input Password with user.password
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password!', 401));
  }

  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({
    status: 'success'
  });
};

// Authentication ////////////////////////////////////////////////////

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get & Check if there is auth token in the header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token || token === 'loggedOut') {
    return next(
      new AppError('You are not logged in. Please Log in to get access!', 401)
    );
  }
  // 2) Verification of Token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this Token does not Exist!', 401)
    );
  }

  // 4) Check whether the user has changed the password after token was issued
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    return next(
      new AppError(
        'Your password was changed recently. Please Login Again',
        401
      )
    );
  }

  // 5) Grant Accces To Protected Route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Check if the user is logged in (For Views)
exports.isLoggedIn = async (req, res, next) => {
  // 1) Get & Check if there is auth token in the header

  let token;
  try {
    if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token || token === 'loggedOut') {
      return next();
    }
    // 2) Verification of Token

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next();
    }

    // 4) Check whether the user has changed the password after token was issued
    if (currentUser.passwordChangedAfter(decoded.iat)) {
      return next();
    }

    // 5) Grant Accces To Protected Route
    req.user = currentUser;
    res.locals.user = currentUser;
    return next();
  } catch (err) {
    return next(err);
  }
};

// Authorization ////////////////////////////////////////////////////
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action!', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Check if input has email
  if (!req.body.email) {
    return next(new AppError('Please Provide an Email Address!', 400));
  }
  // find user by email and check if it exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('No user exist with this Email!', 404));
  }

  // Create a Reset Password Token for the user
  const accessToken = user.createPasswordResetToken();
  // Save To DB
  await user.save({ validateBeforeSave: false });

  // Send Token to the user's email
  const resetURL = `${req.protocol}://${req.get('host')}${
    req.baseUrl
  }/resetPassword/${accessToken}`;
  await new Email(user, resetURL).sendPasswordResetToken();

  res.status(200).json({
    status: 'success',
    message: 'Password Reset Token is Sent To Your Email!'
  });
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // Create a Hash of the Token provided by the user so that it can be compared with passwordResetToken in DB
  const tokenHashed = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: tokenHashed
  });

  // Check If a User Exist with Provided hashedToken
  if (!user) {
    return next(new AppError('Invalid Token!', 400));
  }

  // Check If the token has Already Expired
  if (user.passwordResetExpires < Date.now()) {
    // Means Token Expired Before Current Time
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });
    return next(new AppError('The Token has Expired', 400));
  }

  // At this point of code, it means token is valid, So the password should be changed
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Save To DB
  await user.save();

  // Log the user in

  createSendToken(user, 200, res);
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // This will only work if the user is already logged in!
  // Get The User From The DB Along with Password
  const user = await User.findById(req.user._id).select('+password');

  // Check If the passwordCurrent (POSTed by user) is equal to user.password
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your Current Password is Incorrect!', 401));
  }

  // Update The Password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // Save to DB
  await user.save();

  // Sign JWT
  createSendToken(user, 200, res);
});
