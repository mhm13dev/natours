const mongoose = require('mongoose');
const slugify = require('slugify');

const AppError = require('./../utils/AppError');

// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A Tour Must have Name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A Tour name must be less than or equal to 40'],
      minlength: [10, 'A Tour name must be greater than or equal to 10']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A Tour must have a duration']
    },
    price: {
      type: Number,
      required: [true, 'A Tour must have a Price!']
    },
    priceDiscount: {
      type: Number
      // validate: {
      //   validator: function(val) {
      //     console.log(this.price);

      //     return val < this.price; // this refers to current document on creation. It doesn't work on update
      //   },
      //   message: `The Dicount Price {VALUE} must be less than regular Price!`
      // }
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A Tour must have a Group Size!']
    },
    difficulty: {
      type: String,
      required: [true, 'A Tour must have a Difficulty Level!'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Minimum average ratings must be 1'],
      max: [5, 'Maximum average ratings must be 5']
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    summary: {
      type: String,
      required: [true, 'A Tour must have a Summary'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A Tour must have a Image Cover']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON - type and coordinates fields are required for GeoJSON data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    // Embebeded Locations according to DB Model Plan
    locations: [
      {
        // GeoJSON - type and coordinates fields are required for GeoJSON data
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: String
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
// Virtual Propeties: They do not actually get saved to DB
// Get Duration in Weeks
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Populate tours with reviews but as a virtual property
tourSchema.virtual('reviews', {
  ref: 'Review', // Reference to Model from where to populate this virual property.
  foreignField: 'tour', // Basically path name in the "ref Model" where "ID of current tour" is saved.
  localField: '_id' //  path name of the "current Model" where the "ID of current tour" is saved.
});

// Middlewares or Hooks
// DOCUMENT Middleware: works for .save() and .create() but not update()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });

  // Validate priceDiscount with regular price
  if (this.priceDiscount > this.price) {
    return next(
      new AppError('Discount price must be less than the regular price', 400)
    );
  }
  // this refers to current document being processed!
  next();
});

// Embedding The Guides in Tour
// tourSchema.pre('save', async function(next) {
//   const guides = this.guides.map(async id => {
//     return await User.findById(id).select('-__v -passwordChangedAt');
//   });

//   this.guides = await Promise.all(guides);

//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
// doc refers to current document being processed!
//   next();
// });

// QUERY Middleware: RegExp: works on all queries starting with 'find'
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-passwordChangedAt -__v'
  });
  next();
});

// Validate priceDiscount with regular price
tourSchema.pre('/Update/i', async function(next) {
  const tour = await this.model.findOne(this.getQuery());

  if (this.get('priceDiscount') > tour.price) {
    return next(
      new AppError('Discount price must be less than the regular price', 400)
    );
  }
  next();
});

// AGGREGATE Middleware
tourSchema.pre('aggregate', function(next) {
  const firstStage = this.pipeline()[0];
  if (!Object.keys(firstStage).includes('$geoNear')) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }

  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
