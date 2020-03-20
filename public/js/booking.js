import axios from 'axios';
const stripe = Stripe('pk_test_z3xKGxk5E3dWm5AuWwDV9Zbr001j4jXnJr');

export async function getCheckoutSession(tourId) {
  // Get Checkout Session from the Server
  try {
    const res = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // Redirect To Payment Page
    await stripe.redirectToCheckout({
      sessionId: res.data.session.id
    });
  } catch (error) {
    console.error(error);
  }
}
