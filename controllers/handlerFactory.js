const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = function(Model) {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No Document Exist With That ID!', 404));
    }
    res.status(204).json({
      status: 'success',
      message: 'Successfully Deleted!',
      data: null
    });
  });
};

exports.updateOne = function(Model) {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true,
      runValidators: true
    });
    if (!doc) {
      return next(
        new AppError('The Document With That ID Does Not Exist', 404)
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'Updated Successfully',
      data: {
        data: doc
      }
    });
  });
};

exports.createOne = function(Model) {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Data Added Successfully!',
      data: {
        data: doc
      }
    });
  });
};

exports.getOne = function(Model, popOptions) {
  return catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = Model.findById(req.params.id).populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(
        new AppError('The Document With That ID Does Not Exist', 404)
      );
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });
};

exports.getAll = function(Model) {
  return catchAsync(async (req, res, next) => {
    // Filter For Nested Reviews on Tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // "Tour.find()" returns Query Object While "await Tour.find()" executes query and returns the results
    // Features
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Execute Query
    const doc = await features.query;

    // Send Response
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc
      }
    });
  });
};
