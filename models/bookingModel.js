const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour!']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!']
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a Price!']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  paid: {
    type: Boolean,
    default: true
  },
  active: {
    type: String,
    default: 'yes',
    required: true
  }
});

// One User can Book a Tour Only Once
bookingSchema.index({ user: 1, tour: 1, active: 1 }, { unique: true });
// console.log(bookingSchema.indexes());

bookingSchema.pre(/^find/, function(next) {
  this.find({ active: 'yes' })
    .populate('user')
    .populate('tour');
  next();
});
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
