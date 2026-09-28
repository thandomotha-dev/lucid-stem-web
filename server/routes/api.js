const express = require('express');
const router = express.Router();

const { getAvailability } = require('../controllers/availabilityController');
const { createBooking } = require('../controllers/bookingController');
const {
    getAdminSettings,
    updateAdminSettings,
    getAdminBookings,
    addBlockedDate,
    removeBlockedDate
} = require('../controllers/adminController');

// Public Booking Routes
router.get('/availability', getAvailability);
router.post('/bookings', createBooking);

// Admin Configuration Routes
router.get('/admin/settings', getAdminSettings);
router.put('/admin/settings', updateAdminSettings);
router.get('/admin/bookings', getAdminBookings);
router.post('/admin/blocked-dates', addBlockedDate);
router.delete('/admin/blocked-dates/:date', removeBlockedDate);

module.exports = router;
