const sharp = require('sharp');
const multer = require('multer');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, './public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.originalname.split('.')[1];
//     // user-2eheu4rt47rf4-35324523457.jpg
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

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
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/users/${req.file.filename}`);
  next();
});

function filteredObj(obj, ...allowedFields) {
  const newBody = {};

  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) {
      newBody[el] = obj[el];
    }
  });

  return newBody;
}

// ROUTE HANDLERS
exports.updateMe = catchAsync(async (req, res, next) => {
  // Check If the user is trying to update Password
  if (req.body.password) {
    return next(
      new AppError(
        'You can not update password on this route. Visit /updateMyPassword',
        400
      )
    );
  }

  // This Function Filter out unwanted fields that are not allowed to be updated
  const filteredBody = filteredObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  // Get The User and Update
  const user = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true, // Returns new obj in user variable here
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    message: 'Data Updated Successfully!',
    data: {
      user
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // Not Actually Delete the user but make him inactive
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

// For Admins
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not implemented yet!'
  });
};

exports.sanitizeUpdateUser = (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'You can not update password on this route. Visit /updateMyPassword',
        400
      )
    );
  }
  next();
};
exports.updateUser = factory.updateOne(User);

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
