const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getInfo = (req, res) => {
  res.status(200).json({
    app: 'Natours',
    purpose: 'Learning NodeJS, Express & MongoDB',
    author: 'Mubashir Hassan',
    Date: new Date('2020-06-02')
  });
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // Get All Tours
  const tours = await Tour.find();

  // Create Template and Send Response

  res.status(200).render('overview', {
    title: 'All Tours',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Get The Requested Tour along with Guides and Reviews
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: 'user review rating'
  });

  // Check If the an active booking is already there for this tou by LoggedIn User
  let tourBought = false;
  if (req.user) {
    const booking = await Booking.find({
      user: req.user.id,
      tour: tour.id,
      active: 'yes'
    });
    if (booking.length > 0) {
      tourBought = true;
    }
  }

  if (!tour) {
    return next(new AppError('This Tour does not exist!', 404));
  }
  // Create Template and Send Response
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
    tourBought
  });
});

exports.getLoginForm = (req, res, next) => {
  if (res.locals.user) {
    return res.redirect('/');
  }
  res.status(200).render('login', {
    title: 'Login To Your Account'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'My Account'
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.redirect('/me');
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });
  const tours = bookings.map(el => {
    return el.tour;
  });
  // const tourIds = bookings.map(el => {
  //   return el.tour.id;
  // });

  // const tours = await Tour.find({ _id: { $in: tourIds } });
  // console.log(tourIds);
  // console.log(tours);

  res.status(200).render('overview', {
    title: 'My Bookings',
    tours
  });
});
