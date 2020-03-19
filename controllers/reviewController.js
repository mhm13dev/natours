const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

exports.sanitizeCreateReview = catchAsync(async (req, res, next) => {
  let { tourId } = req.params;
  if (!tourId) {
    tourId = req.body.tour;
  }

  const reviewInput = {
    review: req.body.review,
    rating: req.body.rating,
    tour: tourId,
    user: req.user._id
  };

  req.body = reviewInput;
  next();
});
exports.createReview = factory.createOne(Review);

exports.sanitizeUpdateReview = (req, res, next) => {
  if (req.body.tour || req.body.user) {
    return next(new AppError('Invalid Update Request!', 400));
  }
  next();
};
exports.updateReview = factory.updateOne(Review);

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.deleteReview = factory.deleteOne(Review);
