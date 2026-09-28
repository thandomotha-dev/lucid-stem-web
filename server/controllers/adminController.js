const { dbQuery } = require('../db/database');

async function getAdminSettings(req, res) {
    try {
        const settings = await dbQuery.getSettings();
        const blockedDates = await dbQuery.all(`SELECT id, date, reason FROM blocked_dates ORDER BY date ASC`);
        return res.json({
            success: true,
            settings,
            blockedDates
        });
    } catch (err) {
        console.error('Error fetching admin settings:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch admin settings.' });
    }
}

async function updateAdminSettings(req, res) {
    try {
        const allowedKeys = [
            'booking_start_date',
            'booking_end_date',
            'max_months_ahead',
            'available_weekdays',
            'working_hours_start',
            'working_hours_end',
            'appointment_duration',
            'buffer_time',
            'default_timezone'
        ];

        const updates = {};
        for (const key of allowedKeys) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        await dbQuery.updateSettings(updates);
        const updatedSettings = await dbQuery.getSettings();

        return res.json({
            success: true,
            message: 'Admin settings updated successfully.',
            settings: updatedSettings
        });
    } catch (err) {
        console.error('Error updating admin settings:', err);
        return res.status(500).json({ success: false, error: 'Failed to update admin settings.' });
    }
}

async function getAdminBookings(req, res) {
    try {
        const bookings = await dbQuery.all(`SELECT * FROM bookings ORDER BY start_time_utc DESC`);
        return res.json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch bookings list.' });
    }
}

async function addBlockedDate(req, res) {
    try {
        const { date, reason } = req.body;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, error: 'Valid date (YYYY-MM-DD) is required.' });
        }

        await dbQuery.run(
            `INSERT INTO blocked_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = ?`,
            [date, reason || 'Holiday / Blocked', reason || 'Holiday / Blocked']
        );

        return res.json({ success: true, message: `Date ${date} blocked successfully.` });
    } catch (err) {
        console.error('Error blocking date:', err);
        return res.status(500).json({ success: false, error: 'Failed to block date.' });
    }
}

async function removeBlockedDate(req, res) {
    try {
        const { date } = req.params;
        await dbQuery.run(`DELETE FROM blocked_dates WHERE date = ?`, [date]);
        return res.json({ success: true, message: `Date ${date} unblocked successfully.` });
    } catch (err) {
        console.error('Error unblocking date:', err);
        return res.status(500).json({ success: false, error: 'Failed to unblock date.' });
    }
}

module.exports = {
    getAdminSettings,
    updateAdminSettings,
    getAdminBookings,
    addBlockedDate,
    removeBlockedDate
};
