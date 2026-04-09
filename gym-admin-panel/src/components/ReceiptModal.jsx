import React from 'react';

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

const ReceiptCopy = ({ data, type, copyLabel }) => {
  const gym = data.gym || { name: 'GymPro Fitness', address: 'Dhaka, Bangladesh', phone: '' };

  return (
    <div className="receipt-copy w-full max-w-xs mx-auto border border-slate-300 bg-white p-6 text-xs font-mono">
      {/* Gym Header */}
      <div className="text-center mb-4">
        <h2 className="text-sm font-bold tracking-wide uppercase">{gym.name}</h2>
        <p className="text-slate-500 mt-0.5">{gym.address}</p>
        {gym.phone && <p className="text-slate-500">{gym.phone}</p>}
      </div>

      <div className="border-t border-dashed border-slate-300 my-3" />

      {/* Receipt Info */}
      <div className="flex justify-between mb-1">
        <span className="text-slate-500">Receipt</span>
        <span className="font-semibold">{data.receiptId}</span>
      </div>
      <div className="flex justify-between mb-1">
        <span className="text-slate-500">Date</span>
        <span>{formatDate(type === 'sale' ? data.soldAt : data.payment?.date)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Time</span>
        <span>{formatTime(type === 'sale' ? data.soldAt : data.payment?.date)}</span>
      </div>

      <div className="border-t border-dashed border-slate-300 my-3" />

      {/* Transaction Details */}
      {type === 'payment' ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Member</span>
            <span>{data.member?.name} ({data.member?.memberId})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Phone</span>
            <span>{data.member?.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Package</span>
            <span>{data.package?.name} ({data.package?.duration}d)</span>
          </div>

          <div className="border-t border-dashed border-slate-300 my-3" />

          <div className="flex justify-between">
            <span className="text-slate-500">Amount</span>
            <span>৳{data.payment?.originalAmount}</span>
          </div>
          {data.payment?.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="text-green-700">
                -{data.payment.discountAmount}
                {data.payment.discountType === 'percentage' ? '%' : '৳'}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold">
            <span>Total Paid</span>
            <span>৳{data.payment?.finalAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Method</span>
            <span>{data.payment?.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type</span>
            <span>{data.payment?.paymentType === 'full' ? 'Full Payment' : 'Partial Payment'}</span>
          </div>
          {data.payment?.note && (
            <div className="flex justify-between">
              <span className="text-slate-500">Note</span>
              <span className="text-right max-w-[60%]">{data.payment.note}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Product</span>
            <span>{data.product?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Qty x Price</span>
            <span>{data.quantity} x ৳{data.unitPrice}</span>
          </div>

          <div className="border-t border-dashed border-slate-300 my-3" />

          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span>৳{data.totalAmount}</span>
          </div>
          {data.note && (
            <div className="flex justify-between">
              <span className="text-slate-500">Note</span>
              <span className="text-right max-w-[60%]">{data.note}</span>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-dashed border-slate-300 my-3" />

      {/* Footer */}
      <div className="text-center">
        <p className="text-slate-500 text-[10px]">
          {copyLabel === 'CUSTOMER COPY' ? 'Thank you for choosing us!' : 'For office records only'}
        </p>
        <p className="font-bold mt-2 text-[10px] tracking-widest uppercase text-slate-400">
          {copyLabel}
        </p>
      </div>
    </div>
  );
};

const buildReceiptHTML = (data, type) => {
  const gym = data.gym || { name: 'GymPro Fitness', address: 'Dhaka, Bangladesh', phone: '' };
  const date = formatDate(type === 'sale' ? data.soldAt : data.payment?.date);
  const time = formatTime(type === 'sale' ? data.soldAt : data.payment?.date);

  const transactionRows = type === 'payment' ? `
    <tr><td style="color:#64748b">Member</td><td style="text-align:right">${data.member?.name} (${data.member?.memberId})</td></tr>
    <tr><td style="color:#64748b">Phone</td><td style="text-align:right">${data.member?.phone}</td></tr>
    <tr><td style="color:#64748b">Package</td><td style="text-align:right">${data.package?.name} (${data.package?.duration}d)</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0"></td></tr>
    <tr><td style="color:#64748b">Amount</td><td style="text-align:right">৳${data.payment?.originalAmount}</td></tr>
    ${data.payment?.discountAmount > 0 ? `<tr><td style="color:#64748b">Discount</td><td style="text-align:right;color:#15803d">-${data.payment.discountAmount}${data.payment.discountType === 'percentage' ? '%' : '৳'}</td></tr>` : ''}
    <tr style="font-weight:700;font-size:13px"><td>Total Paid</td><td style="text-align:right">৳${data.payment?.finalAmount}</td></tr>
    <tr><td style="color:#64748b">Method</td><td style="text-align:right">${data.payment?.paymentMethod}</td></tr>
    <tr><td style="color:#64748b">Type</td><td style="text-align:right">${data.payment?.paymentType === 'full' ? 'Full Payment' : 'Partial Payment'}</td></tr>
    ${data.payment?.note ? `<tr><td style="color:#64748b">Note</td><td style="text-align:right">${data.payment.note}</td></tr>` : ''}
  ` : `
    <tr><td style="color:#64748b">Product</td><td style="text-align:right">${data.product?.name}</td></tr>
    <tr><td style="color:#64748b">Qty x Price</td><td style="text-align:right">${data.quantity} x ৳${data.unitPrice}</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0"></td></tr>
    <tr style="font-weight:700;font-size:13px"><td>Total</td><td style="text-align:right">৳${data.totalAmount}</td></tr>
    ${data.note ? `<tr><td style="color:#64748b">Note</td><td style="text-align:right">${data.note}</td></tr>` : ''}
  `;

  const makeCopy = (label, footer) => `
    <div style="border:1px solid #cbd5e1;padding:24px;width:280px;font-family:'Work Sans',system-ui,sans-serif;font-size:11px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${gym.name}</div>
        <div style="color:#64748b;margin-top:2px">${gym.address}</div>
        ${gym.phone ? `<div style="color:#64748b">${gym.phone}</div>` : ''}
      </div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr><td style="color:#64748b">Receipt</td><td style="text-align:right;font-weight:600">${data.receiptId}</td></tr>
        <tr><td style="color:#64748b">Date</td><td style="text-align:right">${date}</td></tr>
        <tr><td style="color:#64748b">Time</td><td style="text-align:right">${time}</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        ${transactionRows}
      </table>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0">
      <div style="text-align:center">
        <div style="color:#64748b;font-size:10px">${footer}</div>
        <div style="font-weight:700;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin-top:8px">${label}</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html><html><head><title>Receipt ${data.receiptId}</title>
    <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body { margin:0; padding:20px; background:#fff; }
      @media print { body { padding:0; } }
    </style>
  </head><body>
    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap">
      ${makeCopy('CUSTOMER COPY', 'Thank you for choosing us!')}
      ${makeCopy('OFFICE COPY', 'For office records only')}
    </div>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;
};

const ReceiptModal = ({ open, onClose, type, data }) => {
  if (!open || !data) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=500');
    if (printWindow) {
      printWindow.document.write(buildReceiptHTML(data, type));
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — hidden during print */}
      <div className="fixed inset-0 bg-slate-900/50" onClick={onClose} />

      {/* Modal content */}
      <div className="relative bg-white rounded-[5px] border border-slate-200 shadow-lg max-w-3xl w-full mx-4 z-10 max-h-[95vh] overflow-y-auto">
        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {type === 'payment' ? 'Payment Receipt' : 'Sale Receipt'}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="rounded-[5px] bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-[5px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Receipt copies — two side by side */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <ReceiptCopy data={data} type={type} copyLabel="CUSTOMER COPY" />
            <ReceiptCopy data={data} type={type} copyLabel="OFFICE COPY" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
