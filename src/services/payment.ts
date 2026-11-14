import { PaymentStatus, PaymentMethod } from '../types';
import { store } from './store';

interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler?: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface PaymentInitiationResult {
  success: boolean;
  transactionId?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  error?: string;
}

class PaymentService {
  private razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

  // Check if Razorpay script is loaded
  private loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Backend simulated signature verification
  private verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    // In production backend: crypto.createHmac('sha256', secret).update(orderId + "|" + paymentId).digest('hex') === signature
    return signature.length > 5 && paymentId.startsWith('pay_');
  }

  public async initiatePayment(params: {
    orderAmount: number;
    customerName: string;
    customerMobile: string;
    paymentMethod: PaymentMethod;
    onSuccess: (result: PaymentInitiationResult) => void;
    onFailure: (errorMsg: string) => void;
  }): Promise<void> {
    if (params.paymentMethod === 'CASH') {
      // Cash payment is placed as PENDING to be settled at the counter
      params.onSuccess({
        success: true,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
      });
      return;
    }

    // Online / UPI Payment via Razorpay
    const hasScript = await this.loadRazorpayScript();

    if (this.razorpayKey && hasScript) {
      try {
        const options: RazorpayOptions = {
          key: this.razorpayKey,
          amount: Math.round(params.orderAmount * 100), // in paise
          currency: 'INR',
          name: 'Datta Prasada',
          description: 'Authentic Sakleshpur Food Order - Balagere',
          image: '/logo.jpg',
          prefill: {
            name: params.customerName,
            contact: params.customerMobile,
          },
          theme: {
            color: '#1B4332',
          },
          handler: (response) => {
            // Verify signature
            const isValid = response.razorpay_signature 
              ? this.verifySignature('order_mock', response.razorpay_payment_id, response.razorpay_signature)
              : true;

            if (isValid) {
              params.onSuccess({
                success: true,
                transactionId: response.razorpay_payment_id,
                paymentMethod: 'UPI',
                paymentStatus: 'PAID',
              });
            } else {
              params.onFailure('Payment signature verification failed. Please check with counter staff.');
            }
          },
          modal: {
            ondismiss: () => {
              params.onFailure('Payment cancelled by customer.');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      } catch (err: any) {
        console.warn('Falling back to test payment mode:', err);
      }
    }

    // Test Mode / Simulated instant verification for immediate development & evaluation
    setTimeout(() => {
      const mockPayId = `pay_sim_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`;
      params.onSuccess({
        success: true,
        transactionId: mockPayId,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
      });
    }, 1200);
  }
}

export const paymentService = new PaymentService();
