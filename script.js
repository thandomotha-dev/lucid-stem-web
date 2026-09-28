document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Navbar
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navList = document.querySelector('.nav-list');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
            // Toggle icon between bars and times
            const icon = mobileToggle.querySelector('i');
            if (navList.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navList.classList.contains('active')) {
                navList.classList.remove('active');
                const icon = mobileToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });

    // 3. Scroll Animations (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    // 4. Smooth Scrolling for Internal Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                // Offset for fixed header
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // 6. Testimonials Slider
    const track = document.getElementById('testimonialTrack');
    const dots = document.querySelectorAll('#sliderDots span');
    let currentSlide = 0;
    
    if (track && dots.length > 0) {
        const updateSlider = (index) => {
            dots.forEach(d => d.classList.remove('active'));
            dots[index].classList.add('active');
            track.style.transform = `translateX(-${index * 100}%)`;
            currentSlide = index;
        };

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => updateSlider(index));
        });

        // Auto slide
        setInterval(() => {
            let nextSlide = (currentSlide + 1) % dots.length;
            updateSlider(nextSlide);
        }, 5000);
    }

    // 7. Dynamic Consultation Booking System & Backend REST API Integration
    const currentMonthYearEl = document.getElementById('currentMonthYear');
    const calendarGridEl = document.getElementById('calendarGrid');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    
    // Modal Elements
    const bookingModal = document.getElementById('bookingModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const bookingSummaryText = document.getElementById('bookingSummaryText');
    const modalBookingDateInput = document.getElementById('modalBookingDate');
    const modalBookingTimeInput = document.getElementById('modalBookingTime');
    const bookingForm = document.getElementById('bookingForm');
    const bookingSuccessMessage = document.getElementById('bookingSuccessMessage');
    const successDetailsText = document.getElementById('successDetailsText');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');

    if (calendarGridEl && currentMonthYearEl) {
        let currentDate = new Date();
        let selectedDateStr = null; // YYYY-MM-DD
        let selectedTime = null;
        let monthlyAvailabilityMap = {};
        let defaultTimezone = 'Africa/Johannesburg';

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        // Helper to format YYYY-MM-DD
        function toDateKey(year, month, day) {
            const m = month < 9 ? `0${month + 1}` : `${month + 1}`;
            const d = day < 10 ? `0${day}` : `${day}`;
            return `${year}-${m}-${d}`;
        }

        async function fetchAndRenderCalendar(dateToRender) {
            const year = dateToRender.getFullYear();
            const month = dateToRender.getMonth(); // 0-11

            currentMonthYearEl.textContent = `${monthNames[month]} ${year}`;

            // Show loading state in calendar grid
            calendarGridEl.innerHTML = '<div style="grid-column: span 7; padding: 2rem; text-align: center; color: var(--color-gray-600);"><i class="fas fa-spinner fa-spin mr-2"></i> Fetching availability...</div>';

            try {
                const response = await fetch(`/api/availability?year=${year}&month=${month + 1}`);
                const data = await response.json();

                if (data.success) {
                    monthlyAvailabilityMap = data.availability || {};
                    if (data.timezone) defaultTimezone = data.timezone;
                } else {
                    monthlyAvailabilityMap = {};
                }
            } catch (err) {
                console.warn('Backend server unavailable or network error. Using fallback client availability.', err);
                monthlyAvailabilityMap = null; // fallback
            }

            renderCalendarGrid(year, month);
        }

        function renderCalendarGrid(year, month) {
            calendarGridEl.innerHTML = '';

            // Render day headers S M T W T F S
            dayHeaders.forEach(day => {
                const headerDiv = document.createElement('div');
                headerDiv.className = 'calendar-day-header text-gray-400';
                headerDiv.textContent = day;
                calendarGridEl.appendChild(headerDiv);
            });

            // First day of current month
            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const prevMonthLastDate = new Date(year, month, 0).getDate();

            // Previous month overflow days
            for (let x = firstDayIndex; x > 0; x--) {
                const prevDayDiv = document.createElement('div');
                prevDayDiv.className = 'calendar-day disabled overflow-day';
                prevDayDiv.textContent = prevMonthLastDate - x + 1;
                calendarGridEl.appendChild(prevDayDiv);
            }

            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);

            let firstAvailableDateKey = null;

            // Current month days
            for (let i = 1; i <= totalDays; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'calendar-day';
                dayDiv.textContent = i;
                
                const dateKey = toDateKey(year, month, i);
                dayDiv.dataset.dateKey = dateKey;

                const thisDate = new Date(year, month, i);
                thisDate.setHours(0, 0, 0, 0);

                // Check backend availability
                let isAvailable = false;
                if (monthlyAvailabilityMap !== null) {
                    isAvailable = Array.isArray(monthlyAvailabilityMap[dateKey]) && monthlyAvailabilityMap[dateKey].length > 0;
                } else {
                    // Fallback client check (non-past days)
                    isAvailable = thisDate >= todayObj && thisDate.getDay() !== 0;
                }

                if (!isAvailable) {
                    dayDiv.classList.add('disabled');
                } else {
                    if (!firstAvailableDateKey) {
                        firstAvailableDateKey = dateKey;
                    }

                    if (selectedDateStr === dateKey) {
                        dayDiv.classList.add('active');
                    }

                    dayDiv.addEventListener('click', () => {
                        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
                        dayDiv.classList.add('active');
                        selectedDateStr = dateKey;
                        renderTimeSlots(dateKey);
                    });
                }

                calendarGridEl.appendChild(dayDiv);
            }

            // Next month overflow days
            const totalRendered = firstDayIndex + totalDays;
            const remainingCells = (totalRendered % 7 === 0) ? 0 : 7 - (totalRendered % 7);
            for (let j = 1; j <= remainingCells; j++) {
                const nextDayDiv = document.createElement('div');
                nextDayDiv.className = 'calendar-day disabled overflow-day';
                nextDayDiv.textContent = j;
                calendarGridEl.appendChild(nextDayDiv);
            }

            // Automatically select first available date if none selected yet
            if (!selectedDateStr && firstAvailableDateKey) {
                selectedDateStr = firstAvailableDateKey;
                const activeEl = calendarGridEl.querySelector(`[data-date-key="${firstAvailableDateKey}"]`);
                if (activeEl) activeEl.classList.add('active');
            }

            if (selectedDateStr) {
                renderTimeSlots(selectedDateStr);
            }
        }

        function renderTimeSlots(dateKey) {
            if (!timeSlotsContainer) return;

            timeSlotsContainer.innerHTML = '';
            let slots = [];

            if (monthlyAvailabilityMap !== null && Array.isArray(monthlyAvailabilityMap[dateKey])) {
                slots = monthlyAvailabilityMap[dateKey];
            } else {
                // Fallback default slots
                slots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '03:00 PM'];
            }

            if (slots.length === 0) {
                timeSlotsContainer.innerHTML = '<div style="grid-column: span 4; padding: 1.5rem; text-align: center; color: var(--color-gray-600); background: var(--color-light); border-radius: 8px;">No available time slots for this date. Please pick another day.</div>';
                selectedTime = null;
                return;
            }

            selectedTime = slots[0];

            slots.forEach((slotTime, idx) => {
                const slotDiv = document.createElement('div');
                slotDiv.className = idx === 0 ? 'time-slot active' : 'time-slot';
                slotDiv.dataset.time = slotTime;
                slotDiv.textContent = slotTime;

                slotDiv.addEventListener('click', function() {
                    timeSlotsContainer.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
                    this.classList.add('active');
                    selectedTime = slotTime;
                });

                timeSlotsContainer.appendChild(slotDiv);
            });
        }

        // Initial fetch
        fetchAndRenderCalendar(currentDate);

        // Previous month button click
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                currentDate.setMonth(currentDate.getMonth() - 1);
                selectedDateStr = null;
                fetchAndRenderCalendar(currentDate);
            });
        }

        // Next month button click
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                currentDate.setMonth(currentDate.getMonth() + 1);
                selectedDateStr = null;
                fetchAndRenderCalendar(currentDate);
            });
        }

        // Confirm booking button click
        if (confirmBookingBtn) {
            confirmBookingBtn.addEventListener('click', (e) => {
                e.preventDefault();

                if (!selectedDateStr || !selectedTime) {
                    alert('Please select an available date and time slot first.');
                    return;
                }

                const [y, m, d] = selectedDateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
                const formattedDateStr = dateObj.toLocaleDateString('en-US', options);

                if (bookingSummaryText) {
                    bookingSummaryText.innerHTML = `<strong>📅 Date:</strong> ${formattedDateStr} &bull; <strong>⏰ Time:</strong> ${selectedTime} (${defaultTimezone})`;
                }
                if (modalBookingDateInput) modalBookingDateInput.value = selectedDateStr;
                if (modalBookingTimeInput) modalBookingTimeInput.value = selectedTime;

                // Reset modal state
                if (bookingForm) {
                    bookingForm.reset();
                    bookingForm.classList.remove('hidden');
                }
                if (bookingSuccessMessage) bookingSuccessMessage.classList.add('hidden');

                // Open modal
                if (bookingModal) {
                    bookingModal.classList.add('active');
                    bookingModal.setAttribute('aria-hidden', 'false');
                }
            });
        }

        // Close modal handlers
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                if (bookingModal) {
                    bookingModal.classList.remove('active');
                    bookingModal.setAttribute('aria-hidden', 'true');
                }
            });
        }

        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                if (bookingModal) {
                    bookingModal.classList.remove('active');
                    bookingModal.setAttribute('aria-hidden', 'true');
                }
            });
        }

        if (bookingModal) {
            bookingModal.addEventListener('click', (e) => {
                if (e.target === bookingModal) {
                    bookingModal.classList.remove('active');
                    bookingModal.setAttribute('aria-hidden', 'true');
                }
            });
        }

        // Form Submission inside modal with Backend REST API validation & Google Meet integration
        if (bookingForm) {
            bookingForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const submitBtn = bookingForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Reserving Slot & Creating Google Meet...';
                }

                const name = document.getElementById('bookingName').value;
                const email = document.getElementById('bookingEmail').value;
                const phone = document.getElementById('bookingPhone').value;
                const notes = document.getElementById('bookingNotes').value;

                const payload = {
                    name,
                    email,
                    phone,
                    subject: 'Lucid Stem Strategy Consultation',
                    notes,
                    selected_date: selectedDateStr,
                    selected_time: selectedTime,
                    timezone: defaultTimezone
                };

                try {
                    const response = await fetch('/api/bookings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        bookingForm.classList.add('hidden');
                        if (bookingSuccessMessage) {
                            bookingSuccessMessage.classList.remove('hidden');
                        }

                        const [y, m, d] = selectedDateStr.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const formattedDateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

                        if (successDetailsText) {
                            let detailsHtml = `Thank you, <strong>${data.name}</strong>! Your strategy consultation is booked for <strong>${formattedDateStr}</strong> at <strong>${data.selectedTime}</strong> (${data.timezone}).`;
                            
                            if (data.googleMeetUrl) {
                                detailsHtml += `<br><br><a href="${data.googleMeetUrl}" target="_blank" class="btn btn-primary btn-block mt-3"><i class="fas fa-video mr-2"></i> Join Google Meet Video Call</a>`;
                            }
                            
                            successDetailsText.innerHTML = detailsHtml;
                        }

                        // Refresh availability from backend to unlist booked slot
                        fetchAndRenderCalendar(currentDate);

                    } else {
                        alert(data.error || 'The requested time slot is no longer available. Please select another time.');
                    }
                } catch (err) {
                    console.error('Booking Error:', err);
                    alert('Failed to process booking. Please check your connection and try again.');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Confirm & Schedule Call';
                    }
                }
            });
        }
    }
});
