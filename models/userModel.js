const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your Name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide an Email!'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid Email!']
  },
  role: {
    type: String,
    enum: ['admin', 'lead-guide', 'guide', 'user'],
    default: 'user'
  },
  photo: { type: String, default: 'default.jpg' },
  password: {
    type: String,
    required: [true, 'Please provide a Password!'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your Password!'],
    validate: {
      // Only works on CREATE and SAVE and not on UPDATE
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

// Hash the password before saving it to DB
userSchema.pre('save', async function(next) {
  // only runs when password is modified or entered for the first time
  if (!this.isModified('password')) return next();

  // Hash the Password
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the passwordConfirm field
  this.passwordConfirm = undefined;

  next();
});

// Add a PasswordChangedAt field if the password is modified and document is not newly created
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  this.passwordChangedAt = Date.now() - 2000; // (2 seconds before the current time) Basically to make sure that the password was changed before issuing the JWT TOKEN below
  next();
});

// Select only active users when querying the DB with /^find/
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});
// Method For Check Login Password
userSchema.methods.correctPassword = async function(password, userPassword) {
  return await bcrypt.compare(password, userPassword);
};

userSchema.methods.passwordChangedAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < passwordChangedTimeStamp;
  }
  return false;
};
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 Minutes

  return resetToken;
};

userSchema.methods.createTokenHash = function(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};
const User = mongoose.model('User', userSchema);

module.exports = User;
