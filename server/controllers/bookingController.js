const { dbQuery } = require('../db/database');
const { createGoogleCalendarEvent } = require('../services/googleCalendar');

/**
 * Parses "YYYY-MM-DD" and "hh:mm AM/PM" into JS Date
 */
function parseDateTimeToUtc(dateStr, timeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    let [time, period] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period && period.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
    } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }

    // Create Date object
    const dt = new Date(year, month - 1, day, hours, minutes, 0);
    return dt;
}

async function createBooking(req, res) {
    try {
        const { name, email, phone, subject, notes, selected_date, selected_time, timezone } = req.body;

        // 1. Validation
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Full name is required.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'A valid email address is required.' });
        }
        if (!selected_date || !/^\d{4}-\d{2}-\d{2}$/.test(selected_date)) {
            return res.status(400).json({ success: false, error: 'Valid booking date (YYYY-MM-DD) is required.' });
        }
        if (!selected_time || typeof selected_time !== 'string') {
            return res.status(400).json({ success: false, error: 'Booking time slot is required.' });
        }

        const bookingSubject = subject && subject.trim() ? subject.trim() : 'Lucid Stem Strategy Consultation';
        const userTimezone = timezone || process.env.DEFAULT_TIMEZONE || 'Africa/Johannesburg';

        // 2. Calculate UTC Start and End Timestamps
        const startDate = parseDateTimeToUtc(selected_date, selected_time);
        
        // Prevent booking past times
        if (startDate <= new Date()) {
            return res.status(400).json({ success: false, error: 'Cannot book appointments in the past.' });
        }

        const settings = await dbQuery.getSettings();
        const durationMins = parseInt(settings.appointment_duration || '30', 10);
        
        const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        // 3. Server-side Concurrency & Overlap Lock Check
        // Query DB to verify if an overlapping booking already exists
        const conflictingBooking = await dbQuery.get(
            `SELECT id FROM bookings WHERE (start_time_utc < ? AND end_time_utc > ?)`,
            [endIso, startIso]
        );

        if (conflictingBooking) {
            return res.status(409).json({
                success: false,
                error: 'Sorry! This time slot was just taken by another user. Please select another time.'
            });
        }

        // 4. Create Google Calendar Event & Generate Google Meet Link
        const googleResult = await createGoogleCalendarEvent({
            name,
            email,
            phone,
            subject: bookingSubject,
            notes,
            startIso,
            endIso,
            timezone: userTimezone
        });

        // 5. Save Booking in Database
        const insertResult = await dbQuery.run(
            `INSERT INTO bookings 
            (name, email, phone, subject, notes, selected_date, start_time_utc, end_time_utc, timezone, google_event_id, google_meet_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim(),
                phone ? phone.trim() : '',
                bookingSubject,
                notes ? notes.trim() : '',
                selected_date,
                startIso,
                endIso,
                userTimezone,
                googleResult.eventId,
                googleResult.meetUrl
            ]
        );

        return res.json({
            success: true,
            bookingId: insertResult.lastID,
            name: name.trim(),
            email: email.trim(),
            selectedDate: selected_date,
            selectedTime: selected_time,
            timezone: userTimezone,
            googleMeetUrl: googleResult.meetUrl,
            message: 'Your strategy consultation has been successfully booked!'
        });

    } catch (err) {
        console.error('Error creating booking:', err);
        return res.status(500).json({ success: false, error: 'An unexpected server error occurred while processing your booking.' });
    }
}

module.exports = { createBooking };
