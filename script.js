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

    // 7. Booking System Interaction
    const calendarDays = document.querySelectorAll('.calendar-day:not(.disabled)');
    const timeSlots = document.getElementById('timeSlots');
    const slots = document.querySelectorAll('.time-slot');
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');

    if (calendarDays.length > 0 && timeSlots) {
        calendarDays.forEach(day => {
            day.addEventListener('click', function() {
                calendarDays.forEach(d => d.classList.remove('active'));
                this.classList.add('active');
                
                timeSlots.style.opacity = '0';
                setTimeout(() => {
                    timeSlots.style.opacity = '1';
                }, 150);
            });
        });

        slots.forEach(slot => {
            slot.addEventListener('click', function() {
                slots.forEach(s => s.classList.remove('active'));
                this.classList.add('active');
            });
        });

        if (confirmBookingBtn) {
            confirmBookingBtn.addEventListener('click', () => {
                alert('Your free strategy consultation has been successfully booked! We have sent a confirmation to your email.');
            });
        }
    }
});
