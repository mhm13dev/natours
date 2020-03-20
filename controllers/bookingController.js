const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const uniqid = require('uniqid');
const factory = require('./handlerFactory');
const Booking = require('./../models/bookingModel');
const User = require('./../models/userModel');
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
    success_url: `${req.protocol}://${req.get(
      'host'
    )}/my-bookings?alert=booking`,
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
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`
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

// exports.createBookingOnCheckout = catchAsync(async (req, res, next) => {
//   const { tour, user, price } = req.query;
//   if (!tour || !user || !price) {
//     return next();
//   }

//   await Booking.create({ tour, user, price });
//   return res.redirect('/');
// });

const createBookingOnCheckout = catchAsync(async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount / 100;
  await Booking.create({ tour, user, price });
  return 'Booking Added Successfully';
});
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    res.status(400).send(`Webhook Error ${error.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Fulfill the Order
    createBookingOnCheckout(session);
  }
  res.status(200).json({
    recieved: true
  });
};
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
