const sharp = require('sharp');
const multer = require('multer');
const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
const factory = require('./handlerFactory');
// ROUTE HANDLERS

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,ratingsAverage,price,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// Aggregation Pipeline
exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: {
        avgRating: -1,
        minPrice: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  const year = req.params.year * 1;
  const tours = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $addFields: {
        year: { $year: '$startDates' }
      }
    },
    {
      $match: { year: year }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        year: { $first: '$year' },
        month: { $first: { $month: '$startDates' } },
        numTours: { $sum: 1 },
        tours: { $push: { name: '$name', date: '$startDates' } }
      }
    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $sort: {
        numTours: -1,
        month: 1
      }
    },
    {
      $project: {
        _id: 0
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  });
});

// /tours-within/:distance/center/:latlong/unit/:unit
// /tours-within/240/center/34.052276,-118.284111/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlong, unit } = req.params;
  const [lat, long] = latlong.split(',');
  if (!lat || !long) {
    return next(
      new AppError(
        'Please Provide Latitude and Longitude in Format lat,long.',
        400
      )
    );
  }

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // Radius in Radians: Lengths in mi or km / radius of earth in mi or km; Radius of Earth in mi: 3963.2, in km: 6378.1
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[long, lat], radius] }
    }
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistancesFrom = catchAsync(async (req, res, next) => {
  const { latlong, unit } = req.params;
  const [lat, long] = latlong.split(',');
  if (!lat || !long) {
    return next(
      new AppError(
        'Please Provide Latitude and Longitude in Format lat,long.',
        400
      )
    );
  }

  const distanceMultiplier = unit === 'mi' ? 0.000621371 : 0.001;
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [long * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier
      }
    },
    {
      $addFields: {
        unit
      }
    },
    {
      $project: {
        name: 1,
        distance: 1,
        unit: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances
    }
  });
});

// Tour Images Upload
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an Image File. Please upload an Image!', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// upload.single('fieldName') for multiple fields with different names
// upload.fields([{},{}]) for multiple fields with different names
// upload.array('fieldName', maxCount) for multiple fields with same names

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/tours/${req.body.imageCover}`);

  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`./public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );
  next();
});
