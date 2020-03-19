const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const uniqid = require('uniqid');
const factory = require('./handlerFactory');
const Booking = require('./../models/bookingModel');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // Get Tour for which checkout session is to be created
  const tour = await Tour.findById(req.params.tourId);
  if (!tour)
    return next(new AppError('The Requested Tour Does Not Exist!', 404));

  // Create checkout session for the tour
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: req.user.email,
    success_url: `${req.protocol}://${req.get('host')}?tour=${tour.id}&user=${
      req.user.id
    }&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        amount: tour.price * 100, // in cents,
        currency: 'usd',
        quantity: 1,
        images: [
          `https://www.natours.dev/img/tours/tour-5cdb06c8d87ca1051d90eda9-1557860998505-cover.jpeg` //TODO: Change it
        ]
      }
    ]
  });
  // Send the Checkout session to the client
  res.status(200).json({
    status: 'success',
    session
  });
});

exports.createBookingOnCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;
  if (!tour || !user || !price) {
    return next();
  }

  await Booking.create({ tour, user, price });
  return res.redirect('/');
});

exports.getAllBookings = factory.getAll(Booking);
exports.createBooking = factory.createOne(Booking);

exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

exports.deleteMyBooking = catchAsync(async (req, res, next) => {
  const activeId = uniqid('no__');
  await Booking.findOneAndUpdate(
    { _id: req.params.bookingId, user: req.user.id },
    {
      active: activeId
    }
  );
  res.status(204).json({
    status: 'success',
    message: 'Booking Deleted Successfully!'
  });
});
