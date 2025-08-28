document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const timeSlotsGrid = document.getElementById('time-slots-grid');
    const bookingSummary = document.getElementById('booking-summary');
    const selectedDateElement = document.getElementById('selected-date');
    const selectedTimeElement = document.getElementById('selected-time');
    const confirmBookingBtn = document.getElementById('confirm-booking');
    const submitAppointmentBtn = document.getElementById('submit-appointment');
    const appointmentForm = document.getElementById('appointment-form');
    const timeSlotsSection = document.getElementById('time-slots');
    
    // Current date
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTime = null;
    
    // Available time slots (in a real app, this would come from your backend/Google Calendar)
    const availableTimeSlots = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ];
    
    // Initialize the calendar
    function initCalendar() {
        renderCalendar();
        setupEventListeners();
    }
    
    // Render the calendar for the current month
    function renderCalendar() {
        // Clear the calendar
        calendarGrid.innerHTML = '';
        
        // Add weekdays header (already in HTML, but we'll keep it dynamic)
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-weekday';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });
        
        // Get first day of month and total days in month
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        
        // Add empty cells for days from previous month
        for (let i = 0; i < firstDay; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day disabled';
            dayElement.textContent = daysInPrevMonth - firstDay + i + 1;
            calendarGrid.appendChild(dayElement);
        }
        
        // Add days of current month
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = i;
            
            // Highlight today
            if (i === currentDay && 
                currentDate.getMonth() === currentMonth && 
                currentDate.getFullYear() === currentYear) {
                dayElement.classList.add('today');
            }
            
            // Highlight selected date
            if (selectedDate && 
                i === selectedDate.getDate() && 
                currentDate.getMonth() === selectedDate.getMonth() && 
                currentDate.getFullYear() === selectedDate.getFullYear()) {
                dayElement.classList.add('selected');
            }
            
            // Disable past dates
            const isPastDate = (currentDate.getMonth() === currentMonth && 
                              currentDate.getFullYear() === currentYear && 
                              i < currentDay) || 
                             (currentDate.getMonth() < currentMonth && 
                              currentDate.getFullYear() === currentYear) ||
                             (currentDate.getFullYear() < currentYear);
            
            if (isPastDate) {
                dayElement.classList.add('disabled');
            } else {
                // Add click event for selectable days
                dayElement.addEventListener('click', () => selectDate(i));
            }
            
            // Disable weekends (Saturday = 6, Sunday = 0)
            const dayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), i).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayElement.classList.add('disabled');
            }
            
            calendarGrid.appendChild(dayElement);
        }
        
        // Update month and year display
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        currentMonthElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    
    // Render available time slots for the selected date
    function renderTimeSlots() {
        timeSlotsGrid.innerHTML = '';
        
        availableTimeSlots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = slot;
            
            if (selectedTime === slot) {
                timeSlot.classList.add('selected');
            }
            
            timeSlot.addEventListener('click', () => {
                // Remove selected class from all time slots
                document.querySelectorAll('.time-slot').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Add selected class to clicked time slot
                timeSlot.classList.add('selected');
                selectedTime = slot;
                
                // Show booking summary
                updateBookingSummary();
            });
            
            timeSlotsGrid.appendChild(timeSlot);
        });
        
        // Show time slots section
        timeSlotsSection.style.display = 'block';
    }
    
    // Update the booking summary with selected date and time
    function updateBookingSummary() {
        if (selectedDate && selectedTime) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = selectedDate.toLocaleDateString('en-US', options);
            
            selectedDateElement.textContent = formattedDate;
            selectedTimeElement.textContent = selectedTime;
            
            // Show booking summary
            bookingSummary.style.display = 'block';
            
            // Enable submit button
            submitAppointmentBtn.disabled = false;
        }
    }
    
    // Handle date selection
    function selectDate(day) {
        selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        selectedTime = null;
        bookingSummary.style.display = 'none';
        submitAppointmentBtn.disabled = true;
        
        // Re-render calendar to update selected state
        renderCalendar();
        
        // Show time slots for selected date
        renderTimeSlots();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Previous month button
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        
        // Next month button
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
        
        // Confirm booking button
        confirmBookingBtn.addEventListener('click', () => {
            // Scroll to form
            appointmentForm.scrollIntoView({ behavior: 'smooth' });
        });
        
        // Form submission
        appointmentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value,
                date: selectedDate.toISOString().split('T')[0],
                time: selectedTime
            };
            
            // In a real app, you would send this data to your backend
            console.log('Appointment details:', formData);
            
            // Show success message
            alert('Your appointment has been scheduled successfully! We will contact you shortly to confirm.');
            
            // Reset form
            appointmentForm.reset();
            selectedDate = null;
            selectedTime = null;
            bookingSummary.style.display = 'none';
            timeSlotsSection.style.display = 'none';
            submitAppointmentBtn.disabled = true;
            
            // Re-render calendar
            renderCalendar();
        });
    }
    
    // Initialize the calendar
    initCalendar();
});
