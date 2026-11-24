import { PaymentStatus, PaymentMethod } from '../types';

export interface PaymentInitiationResult {
  success: boolean;
  transactionId?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  error?: string;
}

class PaymentService {
  public async initiatePayment(params: {
    orderAmount: number;
    customerName: string;
    customerMobile: string;
    paymentMethod: PaymentMethod;
    onSuccess: (result: PaymentInitiationResult) => void;
    onFailure: (errorMsg: string) => void;
  }): Promise<void> {
    if (params.paymentMethod !== 'CASH') {
      params.onFailure('Online payments are unavailable until server payment verification is configured. Please select cash at counter.');
      return;
    }
    params.onSuccess({ success: true, paymentMethod: 'CASH', paymentStatus: 'PENDING' });
  }
}
export const paymentService = new PaymentService();
