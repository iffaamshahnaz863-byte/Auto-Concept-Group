
import { UserProfile, Car } from '../types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentParams {
  car: Car;
  user: UserProfile;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
}

export const initializeRazorpayPayment = ({ car, user, onSuccess, onFailure }: PaymentParams) => {
  const options = {
    key: 'rzp_live_RxmIholkGEOYaL', // Live Key ID
    amount: 25000 * 100, // Amount in paise (Rs. 25,000)
    currency: 'INR',
    name: 'Auto Concept Group',
    description: `Booking for ${car.brand} ${car.name}`,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c3d9?auto=format&fit=crop&q=80&w=100',
    handler: function(response: any) {
      // payment_id: response.razorpay_payment_id
      // order_id: response.razorpay_order_id (if applicable)
      // signature: response.razorpay_signature (for server verification)
      onSuccess(response);
    },
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone || ''
    },
    notes: {
      car_id: car.id,
      dealer_id: car.dealer_id
    },
    theme: {
      color: '#2563eb' // Blue-600
    },
    modal: {
      ondismiss: function() {
        onFailure({ message: 'Payment cancelled by user' });
      }
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};
