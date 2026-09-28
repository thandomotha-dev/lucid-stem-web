const { dbQuery } = require('../db/database');

/**
 * Helper to convert HH:MM to minutes from midnight
 */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Helper to format minutes from midnight to 12-hour AM/PM string
 */
function minutesTo12Hour(minutes) {
    let h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    const mStr = m < 10 ? `0${m}` : `${m}`;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    return `${hStr}:${mStr} ${period}`;
}

/**
 * Helper to format YYYY-MM-DD string
 */
function formatDateKey(year, month, day) {
    const m = month < 10 ? `0${month}` : `${month}`;
    const d = day < 10 ? `0${day}` : `${day}`;
    return `${year}-${m}-${d}`;
}

async function getAvailability(req, res) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Parse query params or default to current month/year
        let year = parseInt(req.query.year, 10) || today.getFullYear();
        let month = parseInt(req.query.month, 10); // 1-12
        if (!month || month < 1 || month > 12) {
            month = today.getMonth() + 1;
        }

        // Fetch settings, blocked dates, and existing bookings
        const settings = await dbQuery.getSettings();
        const blockedRows = await dbQuery.all(`SELECT date FROM blocked_dates`);
        const blockedDatesSet = new Set(blockedRows.map(r => r.date));

        const maxMonthsAhead = parseInt(settings.max_months_ahead || '3', 10);
        const availableWeekdays = (settings.available_weekdays || '1,2,3,4,5').split(',').map(Number);
        const startWorkMins = timeToMinutes(settings.working_hours_start || '09:00');
        const endWorkMins = timeToMinutes(settings.working_hours_end || '17:00');
        const durationMins = parseInt(settings.appointment_duration || '30', 10);
        const bufferMins = parseInt(settings.buffer_time || '15', 10);
        const timezone = settings.default_timezone || process.env.DEFAULT_TIMEZONE || 'Africa/Johannesburg';

        // Calculate max allowed date based on max_months_ahead
        const maxBookingDate = new Date(today);
        maxBookingDate.setMonth(maxBookingDate.getMonth() + maxMonthsAhead);

        // Fetch existing bookings for this month
        const monthStartIso = new Date(year, month - 1, 1).toISOString();
        const monthEndIso = new Date(year, month, 1).toISOString();
        const existingBookings = await dbQuery.all(
            `SELECT start_time_utc, end_time_utc, selected_date FROM bookings WHERE start_time_utc >= ? AND start_time_utc < ?`,
            [monthStartIso, monthEndIso]
        );

        const totalDaysInMonth = new Date(year, month, 0).getDate();
        const availabilityMap = {};

        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dateObj = new Date(year, month - 1, day);
            dateObj.setHours(0, 0, 0, 0);

            const dateKey = formatDateKey(year, month, day);

            // 1. Check if past date
            if (dateObj < today) {
                continue;
            }

            // 2. Check if outside configured start/end range or max months ahead
            if (dateObj > maxBookingDate) {
                continue;
            }
            if (settings.booking_start_date && dateKey < settings.booking_start_date) {
                continue;
            }
            if (settings.booking_end_date && dateKey > settings.booking_end_date) {
                continue;
            }

            // 3. Check weekday availability (0=Sun, 1=Mon, ..., 6=Sat)
            const weekday = dateObj.getDay(); // 0-6
            if (!availableWeekdays.includes(weekday)) {
                continue;
            }

            // 4. Check blocked dates / holidays
            if (blockedDatesSet.has(dateKey)) {
                continue;
            }

            // 5. Generate time slots for this valid working day
            const daySlots = [];
            let currentSlotStart = startWorkMins;

            while (currentSlotStart + durationMins <= endWorkMins) {
                const currentSlotEnd = currentSlotStart + durationMins;

                // Create slot start/end Date objects for overlap check
                const slotStartDate = new Date(year, month - 1, day, Math.floor(currentSlotStart / 60), currentSlotStart % 60);
                const slotEndDate = new Date(year, month - 1, day, Math.floor(currentSlotEnd / 60), currentSlotEnd % 60);

                // If today, skip slots in the past
                const now = new Date();
                if (slotStartDate <= now) {
                    currentSlotStart += durationMins + bufferMins;
                    continue;
                }

                // Check overlap against existing bookings
                const slotStartIso = slotStartDate.toISOString();
                const slotEndIso = slotEndDate.toISOString();

                const isOverlapping = existingBookings.some(b => {
                    return (slotStartIso < b.end_time_utc && slotEndIso > b.start_time_utc);
                });

                if (!isOverlapping) {
                    daySlots.push({
                        time: minutesTo12Hour(currentSlotStart),
                        startMins: currentSlotStart,
                        endMins: currentSlotEnd
                    });
                }

                currentSlotStart += durationMins + bufferMins;
            }

            // Only add dates that have at least 1 available slot
            if (daySlots.length > 0) {
                availabilityMap[dateKey] = daySlots.map(s => s.time);
            }
        }

        return res.json({
            success: true,
            year,
            month,
            timezone,
            settings: {
                max_months_ahead: maxMonthsAhead,
                available_weekdays: availableWeekdays,
                working_hours_start: settings.working_hours_start,
                working_hours_end: settings.working_hours_end,
                appointment_duration: durationMins,
                buffer_time: bufferMins
            },
            availability: availabilityMap
        });

    } catch (err) {
        console.error('Error calculating availability:', err);
        return res.status(500).json({ success: false, error: 'Failed to calculate booking availability.' });
    }
}

module.exports = { getAvailability };
