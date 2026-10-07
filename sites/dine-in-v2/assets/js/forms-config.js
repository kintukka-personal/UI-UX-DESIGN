/* Where the booking enquiry and the contact "Ask Brooke" form send.

   Each value is a Formspree form endpoint (https://formspree.io, free plan:
   50 submissions a month). To set one up:
     1. Sign up at formspree.io with dineinbybrooke@gmail.com.
     2. New form → name it "Booking enquiry" → copy its endpoint,
        e.g. https://formspree.io/f/abcdwxyz
     3. Paste it below, then do the same for "Website question".
   Submissions are emailed to Brooke, and the visitor's email is the reply-to.

   While a value is empty the form falls back to opening the visitor's email
   app with everything filled in, so an enquiry is never silently lost. */
window.DINE_IN_FORMS = {
  booking: '',
  ask: ''
};
