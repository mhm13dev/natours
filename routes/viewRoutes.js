const express = require('express');
const viewController = require('../controllers/viewController');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();
// isLoggedIn - When We Dont want to Display Error If User is Not Logged in
// protect - When We want to Display Error If User is Not Logged in

router.get('/info', viewController.getInfo);

router.get('/me', authController.protect, viewController.getAccount);
router.post(
  '/update-user-data',
  authController.protect,
  viewController.updateUserData
);
router.get(
  '/my-bookings',
  authController.protect,
  viewController.getMyBookings
);

router.use(authController.isLoggedIn);

router.get(
  '/',
  bookingController.createBookingOnCheckout,
  viewController.getOverview
);
router.get('/tour/:slug', viewController.getTour);
router.get('/login', viewController.getLoginForm);

module.exports = router;
