const mongoose = require('mongoose');
const Tour = require('./tourModel');
const AppError = require('./../utils/AppError');

// Create Schema
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user!']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populate The Review with User and Tour
reviewSchema.pre(/^find/, function(next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name'
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo'
  //   });

  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

// Calculate ratingsQuantity and ratingsAverage For Tours when a Review is Saved or Updated
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // Static method is a method on the Model
  // In Static Method 'this' refers to Model

  const avgStats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRatings: { $avg: '$rating' }
      }
    }
  ]);

  // console.log(avgStats);
  if (avgStats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: avgStats[0].nRatings,
      ratingsAverage: avgStats[0].avgRatings.toFixed(1)
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', function(doc, next) {
  this.constructor.calcAverageRatings(doc.tour);
  next();
});

reviewSchema.post(/^findOneAnd/, async function(doc, next) {
  if (!doc) {
    return next(new AppError('Review Does Not Exist!', 404));
  }
  doc.constructor.calcAverageRatings(doc.tour);
  next();
});
// Create Model out of Schema
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
