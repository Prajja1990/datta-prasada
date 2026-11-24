import React, { useRef } from 'react';
import { Order } from '../../types';
import { Printer, X, Check, Coffee } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ThermalReceiptModalProps {
  order: Order;
  mode?: 'RECEIPT' | 'KOT'; // Receipt vs Kitchen Order Ticket
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  mode = 'RECEIPT',
  isOpen,
  onClose,
}) => {
  const { language } = useLanguage();
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gold-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-temple-900 text-cream-100 border-b border-gold-700/40">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gold-400" />
            <span className="font-serif font-bold text-lg">
              {mode === 'KOT' ? 'Kitchen Order Ticket (KOT)' : 'Thermal Slip Preview'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-cream-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Container - styled like an authentic 80mm / 58mm thermal receipt paper */}
        <div className="p-6 overflow-y-auto bg-stone-100 flex justify-center">
          <div
            id="thermal-print-area"
            ref={printAreaRef}
            className="w-full max-w-[72mm] bg-white p-4 shadow-md rounded border border-dashed border-stone-300 text-black font-mono text-xs leading-tight"
          >
            {/* Header */}
            <div className="text-center mb-3">
              <div className="w-12 h-12 mx-auto mb-1.5 rounded-lg overflow-hidden border border-stone-300">
                <img src="/logo.jpg" alt="Datta Prasada" className="w-full h-full object-cover grayscale contrast-125" />
              </div>
              <div className="font-bold text-base tracking-wider uppercase font-serif">
                DATTA PRASADA
              </div>
              <div className="text-[10px] text-stone-600">
                Authentic Sakleshpur Taste
              </div>
              <div className="text-[9px] text-stone-500">
                Balagere Main Rd, Panathur, Bangalore
              </div>
              <div className="text-[9px] text-stone-500">
                GSTIN: 29AAECD1234F1Z8
              </div>
              <div className="border-t border-b border-dashed border-stone-400 my-2 py-1 font-bold text-[11px]">
                {mode === 'KOT' ? '*** KITCHEN ORDER TICKET ***' : '*** TAX INVOICE / RECEIPT ***'}
              </div>
            </div>

            {/* Token Badge */}
            <div className="text-center bg-stone-100 py-2 border border-black rounded my-2">
              <div className="text-[10px] font-bold uppercase tracking-wider">TOKEN NUMBER</div>
              <div className="text-2xl font-black tracking-tight">{order.tokenNumber}</div>
              <div className="text-[10px] font-bold uppercase">
                {order.orderType === 'DINE_IN' ? `DINE-IN (Table: ${order.tableNumber || 'Self'})` : 'TAKEAWAY / PARCEL'}
              </div>
            </div>

            {/* Order Meta */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-stone-300 pb-2 mb-2">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(order.createdAt).toLocaleDateString('en-IN')} {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Mobile:</span>
                <span>{order.customerMobile}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Ref:</span>
                <span>#{order.id.slice(-6)}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-b border-dashed border-stone-400 pb-2 mb-2">
              <div className="flex justify-between font-bold text-[10px] border-b border-stone-200 pb-1 mb-1">
                <span className="w-8">QTY</span>
                <span className="flex-1 text-left px-1">ITEM</span>
                {mode === 'RECEIPT' && <span className="w-12 text-right">PRICE</span>}
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-0.5 text-[11px]">
                  <span className="w-8 font-bold">{item.quantity}x</span>
                  <span className="flex-1 text-left px-1">
                    {language === 'kn' && item.nameKn ? item.nameKn : item.name}
                  </span>
                  {mode === 'RECEIPT' && (
                    <span className="w-12 text-right">₹{item.totalPrice}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Order Notes / Kitchen Instructions */}
            {order.notes && (
              <div className="bg-stone-50 p-1.5 border border-stone-300 rounded mb-2 text-[10px]">
                <span className="font-bold">INSTRUCTIONS: </span>
                <span>{order.notes}</span>
              </div>
            )}

            {/* Financial Totals for Receipt */}
            {mode === 'RECEIPT' && (
              <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2 mb-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-stone-600">
                  <span>GST (5%):</span>
                  <span>₹{order.taxAmount.toFixed(2)}</span>
                </div>
                {order.orderType === 'TAKEAWAY' && <div className="flex justify-between"><span>Parcel charge:</span><span>₹{(order.parcelCharge || 0).toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-stone-300">
                  <span>GRAND TOTAL:</span>
                  <span>₹{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1">
                  <span>Payment Mode:</span>
                  <span className="font-bold">{order.paymentMethod} ({order.paymentStatus})</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[9px] text-stone-600 mt-3 space-y-1">
              <div>Thank You for dining with us!</div>
              <div className="font-serif font-bold text-stone-800">ಶ್ರೀ ಗುರುದೇವ ದತ್ತ</div>
              <div>Keep this token safely until food delivery.</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between p-4 bg-white border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium text-sm rounded-lg hover:bg-stone-100 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-temple-600 hover:bg-temple-700 text-white font-medium text-sm rounded-lg shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print to Thermal Printer
          </button>
        </div>
      </div>
    </div>
  );
};
