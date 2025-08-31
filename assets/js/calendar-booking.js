// Calendar Booking Component
class CalendarBooking {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.selectedDate = null;
        this.selectedTime = null;
        this.googleCalendarId = 'infusionbio@gmail.com';
        this.timezone = 'Europe/Paris';
        
        // Available time slots (24-hour format)
        this.timeSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
            '17:00', '17:30'
        ];
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="booking-calendar">
                <div class="calendar-header">
                    <button class="nav-btn prev-month" id="prevMonth">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3 class="current-month" id="currentMonth"></h3>
                    <button class="nav-btn next-month" id="nextMonth">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="calendar-grid">
                    <div class="weekdays">
                        <div class="weekday">Sun</div>
                        <div class="weekday">Mon</div>
                        <div class="weekday">Tue</div>
                        <div class="weekday">Wed</div>
                        <div class="weekday">Thu</div>
                        <div class="weekday">Fri</div>
                        <div class="weekday">Sat</div>
                    </div>
                    <div class="days" id="calendarDays"></div>
                </div>
                
                <div class="time-slots-section" id="timeSlotsSection" style="display: none;">
                    <h4>Available Times</h4>
                    <div class="time-slots" id="timeSlots"></div>
                </div>
                
                <div class="booking-form" id="bookingForm" style="display: none;">
                    <h4>Book Your Meeting</h4>
                    <div class="selected-datetime" id="selectedDateTime"></div>
                    <div class="form-group">
                        <input type="text" id="clientName" placeholder="Your Name" required>
                    </div>
                    <div class="form-group">
                        <input type="email" id="clientEmail" placeholder="Your Email" required>
                    </div>
                    <div class="form-group">
                        <textarea id="meetingDescription" placeholder="Meeting description (optional)" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button class="btn-cancel" id="cancelBooking">Cancel</button>
                        <button class="btn-book" id="confirmBooking">Book Meeting</button>
                    </div>
                </div>
            </div>
        `;
        
        this.updateCalendar();
    }
    
    updateCalendar() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const currentMonthElement = document.getElementById('currentMonth');
        currentMonthElement.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        this.renderDays();
    }
    
    renderDays() {
        const daysContainer = document.getElementById('calendarDays');
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const today = new Date();
        
        let daysHTML = '';
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            daysHTML += '<div class="day empty"></div>';
        }
        
        // Add days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
            const isToday = date.toDateString() === today.toDateString();
            const isPast = date < today && !isToday;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            let dayClass = 'day';
            if (isToday) dayClass += ' today';
            if (isPast) dayClass += ' past';
            if (isWeekend) dayClass += ' weekend';
            if (!isPast && !isWeekend) dayClass += ' available';
            
            daysHTML += `<div class="${dayClass}" data-date="${date.toISOString().split('T')[0]}">${day}</div>`;
        }
        
        daysContainer.innerHTML = daysHTML;
    }
    
    attachEventListeners() {
        // Navigation buttons
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.updateCalendar();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.updateCalendar();
        });
        
        // Day selection
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('day') && e.target.classList.contains('available')) {
                // Remove previous selection
                this.container.querySelectorAll('.day.selected').forEach(day => {
                    day.classList.remove('selected');
                });
                
                // Select new day
                e.target.classList.add('selected');
                this.selectedDate = e.target.dataset.date;
                this.showTimeSlots();
            }
        });
        
        // Time slot selection
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('time-slot')) {
                // Remove previous selection
                this.container.querySelectorAll('.time-slot.selected').forEach(slot => {
                    slot.classList.remove('selected');
                });
                
                // Select new time
                e.target.classList.add('selected');
                this.selectedTime = e.target.dataset.time;
                this.showBookingForm();
            }
        });
        
        // Booking form actions
        document.getElementById('cancelBooking').addEventListener('click', () => {
            this.hideBookingForm();
        });
        
        document.getElementById('confirmBooking').addEventListener('click', () => {
            this.handleBooking();
        });
    }
    
    showTimeSlots() {
        const timeSlotsSection = document.getElementById('timeSlotsSection');
        const timeSlotsContainer = document.getElementById('timeSlots');
        
        let slotsHTML = '';
        this.timeSlots.forEach(time => {
            slotsHTML += `<button class="time-slot" data-time="${time}">${time}</button>`;
        });
        
        timeSlotsContainer.innerHTML = slotsHTML;
        timeSlotsSection.style.display = 'block';
        
        // Hide booking form
        document.getElementById('bookingForm').style.display = 'none';
    }
    
    showBookingForm() {
        const bookingForm = document.getElementById('bookingForm');
        const selectedDateTime = document.getElementById('selectedDateTime');
        
        const date = new Date(this.selectedDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        selectedDateTime.innerHTML = `
            <div class="datetime-display">
                <i class="fas fa-calendar-alt"></i>
                <span>${formattedDate} at ${this.selectedTime}</span>
            </div>
        `;
        
        bookingForm.style.display = 'block';
    }
    
    hideBookingForm() {
        document.getElementById('bookingForm').style.display = 'none';
        document.getElementById('timeSlotsSection').style.display = 'none';
        
        // Clear selections
        this.container.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        this.selectedDate = null;
        this.selectedTime = null;
    }
    
    handleBooking() {
        const name = document.getElementById('clientName').value;
        const email = document.getElementById('clientEmail').value;
        const description = document.getElementById('meetingDescription').value;
        
        if (!name || !email) {
            alert('Please fill in your name and email.');
            return;
        }
        
        // Create Google Calendar event URL
        const startDateTime = new Date(`${this.selectedDate}T${this.selectedTime}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 minutes later
        
        const googleCalendarUrl = this.createGoogleCalendarUrl({
            title: `Meeting with ${name}`,
            start: startDateTime,
            end: endDateTime,
            description: `Meeting with ${name} (${email})${description ? '\n\n' + description : ''}`,
            location: 'Video Call'
        });
        
        // Open Google Calendar to create event
        window.open(googleCalendarUrl, '_blank');
        
        // Show success message
        alert(`Meeting scheduled for ${this.selectedDate} at ${this.selectedTime}. Google Calendar will open to confirm the event.`);
        
        // Reset form
        this.hideBookingForm();
        document.getElementById('clientName').value = '';
        document.getElementById('clientEmail').value = '';
        document.getElementById('meetingDescription').value = '';
    }
    
    createGoogleCalendarUrl(event) {
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: event.title,
            dates: `${formatDate(event.start)}/${formatDate(event.end)}`,
            details: event.description,
            location: event.location,
            ctz: this.timezone
        });
        
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('bookingCalendar')) {
        new CalendarBooking('bookingCalendar');
    }
});
