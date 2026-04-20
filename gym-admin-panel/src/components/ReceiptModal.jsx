import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

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

const PAYMENT_TYPE_LABEL = {
  full: 'Full',
  partial: 'Partial',
  due: 'Due',
  monthly: 'Monthly',
  monthly_renewal: 'Monthly Renewal',
};
const labelPaymentType = (t) => PAYMENT_TYPE_LABEL[t] || 'Partial';

const formatDuration = (pkg) => {
  if (!pkg) return '-';
  if (pkg.isLifetime || pkg.duration === 0) return 'Lifetime';
  return `${pkg.duration} days`;
};

const ReceiptCopy = ({ data, type, copyLabel }) => {
  const gym = data.gym || { name: 'GymPro Fitness', address: 'Dhaka, Bangladesh', phone: '' };

  return (
    <div className="receipt-copy w-full max-w-[260px] mx-auto border border-slate-300 bg-white p-5 text-[11px] font-mono text-slate-900">
      {/* Gym Header */}
      <div className="text-center mb-3">
        <h2 className="text-[13px] font-bold tracking-[2px] uppercase">{gym.name}</h2>
        <div className="border-t-2 border-slate-900 w-12 mx-auto mt-1.5 mb-1.5" />
        <p className="text-slate-500 text-[10px]">{gym.address}</p>
        {gym.phone && <p className="text-slate-500 text-[10px]">{gym.phone}</p>}
      </div>

      <div className="border-t border-dashed border-slate-300 my-2.5" />

      {/* Receipt Info */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Receipt No.</span>
          <span className="font-bold">{data.receiptId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date</span>
          <span>{formatDate(type === 'sale' ? data.soldAt : data.payment?.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Time</span>
          <span>{formatTime(type === 'sale' ? data.soldAt : data.payment?.date)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 my-2.5" />

      {/* Transaction Details */}
      {type === 'payment' ? (
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between font-semibold text-[11px]">
            <span>Member</span>
            <span>{data.member?.memberId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Name</span>
            <span>{data.member?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Phone</span>
            <span>{data.member?.phone}</span>
          </div>

          <div className="border-t border-dotted border-slate-200 my-2" />

          <div className="flex justify-between">
            <span className="text-slate-500">Package</span>
            <span>{data.package?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Duration</span>
            <span>{formatDuration(data.package)}</span>
          </div>
          {data.package?.description && (
            <p className="text-[9px] text-slate-400 italic">{data.package.description}</p>
          )}
          {data.package?.benefits && data.package.benefits.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {data.package.benefits.map((b, i) => (
                <div key={i} className="text-[9px] text-slate-400">&#10003; {b}</div>
              ))}
            </div>
          )}

          <div className="border-t border-dotted border-slate-200 my-2" />

          <div className="flex justify-between">
            <span className="text-slate-500">Amount</span>
            <span>৳{data.payment?.originalAmount?.toLocaleString()}</span>
          </div>
          {data.payment?.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Discount</span>
              <span className="text-green-700 dark:text-green-300">
                -{data.payment.discountAmount}{data.payment.discountType === 'percentage' ? '%' : '৳'}
              </span>
            </div>
          )}

          <div className="border-t border-slate-900 my-2" />

          <div className="flex justify-between text-[13px] font-bold">
            <span>TOTAL</span>
            <span>৳{data.payment?.finalAmount?.toLocaleString()}</span>
          </div>

          <div className="border-t border-slate-900 my-2" />

          <div className="flex justify-between">
            <span className="text-slate-500">Method</span>
            <span>{data.payment?.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Type</span>
            <span>{labelPaymentType(data.payment?.paymentType)}</span>
          </div>
          {data.payment?.note && (
            <div className="flex justify-between">
              <span className="text-slate-500">Note</span>
              <span className="text-right max-w-[55%] text-[9px]">{data.payment.note}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between font-semibold text-[11px]">
            <span>Product</span>
            <span>{data.product?.name}</span>
          </div>

          <div className="border-t border-dotted border-slate-200 my-2" />

          <div className="flex justify-between">
            <span className="text-slate-500">Unit Price</span>
            <span>৳{data.unitPrice?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Quantity</span>
            <span>{data.quantity}</span>
          </div>

          <div className="border-t border-slate-900 my-2" />

          <div className="flex justify-between text-[13px] font-bold">
            <span>TOTAL</span>
            <span>৳{data.totalAmount?.toLocaleString()}</span>
          </div>

          <div className="border-t border-slate-900 my-2" />

          {data.note && (
            <div className="flex justify-between">
              <span className="text-slate-500">Note</span>
              <span className="text-right max-w-[55%] text-[9px]">{data.note}</span>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-dashed border-slate-300 my-2.5" />

      {/* Footer */}
      <div className="text-center">
        <p className="text-slate-400 text-[9px]">
          {copyLabel === 'CUSTOMER COPY' ? 'Thank you for choosing us!' :
           copyLabel === 'OFFICE COPY' ? 'For office records only' :
           'Accounts department copy'}
        </p>
        <p className="font-bold mt-1.5 text-[9px] tracking-[3px] uppercase text-slate-400 border-t border-dashed border-slate-200 pt-1.5">
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
    <tr style="font-weight:600"><td>Member</td><td style="text-align:right">${data.member?.memberId}</td></tr>
    <tr><td style="color:#64748b">Name</td><td style="text-align:right">${data.member?.name}</td></tr>
    <tr><td style="color:#64748b">Phone</td><td style="text-align:right">${data.member?.phone}</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:1px dotted #e2e8f0;margin:6px 0"></td></tr>
    <tr><td style="color:#64748b">Package</td><td style="text-align:right">${data.package?.name}</td></tr>
    <tr><td style="color:#64748b">Duration</td><td style="text-align:right">${formatDuration(data.package)}</td></tr>
    ${data.package?.description ? `<tr><td colspan="2" style="font-size:9px;color:#94a3b8;font-style:italic;padding-top:2px">${data.package.description}</td></tr>` : ''}
    ${data.package?.benefits?.length ? `<tr><td colspan="2" style="padding-top:3px"><div style="font-size:9px;color:#94a3b8">${data.package.benefits.map(b => `<div>&#10003; ${b}</div>`).join('')}</div></td></tr>` : ''}
    <tr><td colspan="2"><hr style="border:none;border-top:1px dotted #e2e8f0;margin:6px 0"></td></tr>
    <tr><td style="color:#64748b">Amount</td><td style="text-align:right">৳${data.payment?.originalAmount?.toLocaleString()}</td></tr>
    ${data.payment?.discountAmount > 0 ? `<tr><td style="color:#64748b">Discount</td><td style="text-align:right;color:#15803d">-${data.payment.discountAmount}${data.payment.discountType === 'percentage' ? '%' : '৳'}</td></tr>` : ''}
    <tr><td colspan="2"><hr style="border:none;border-top:2px solid #0f172a;margin:6px 0"></td></tr>
    <tr style="font-weight:700;font-size:14px"><td>TOTAL</td><td style="text-align:right">৳${data.payment?.finalAmount?.toLocaleString()}</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:2px solid #0f172a;margin:6px 0"></td></tr>
    <tr><td style="color:#64748b">Method</td><td style="text-align:right">${data.payment?.paymentMethod}</td></tr>
    <tr><td style="color:#64748b">Type</td><td style="text-align:right">${labelPaymentType(data.payment?.paymentType)}</td></tr>
    ${data.payment?.note ? `<tr><td style="color:#64748b">Note</td><td style="text-align:right;font-size:9px">${data.payment.note}</td></tr>` : ''}
  ` : `
    <tr style="font-weight:600"><td>Product</td><td style="text-align:right">${data.product?.name}</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:1px dotted #e2e8f0;margin:6px 0"></td></tr>
    <tr><td style="color:#64748b">Unit Price</td><td style="text-align:right">৳${data.unitPrice?.toLocaleString()}</td></tr>
    <tr><td style="color:#64748b">Quantity</td><td style="text-align:right">${data.quantity}</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:2px solid #0f172a;margin:6px 0"></td></tr>
    <tr style="font-weight:700;font-size:14px"><td>TOTAL</td><td style="text-align:right">৳${data.totalAmount?.toLocaleString()}</td></tr>
    <tr><td colspan="2"><hr style="border:none;border-top:2px solid #0f172a;margin:6px 0"></td></tr>
    ${data.note ? `<tr><td style="color:#64748b">Note</td><td style="text-align:right;font-size:9px">${data.note}</td></tr>` : ''}
  `;

  const makeCopy = (label, footer) => `
    <div style="border:1px solid #cbd5e1;padding:20px;width:260px;font-family:'Work Sans',system-ui,sans-serif;font-size:10px;flex-shrink:0">
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${gym.name}</div>
        <div style="border-top:2px solid #0f172a;width:40px;margin:6px auto"></div>
        <div style="color:#64748b;font-size:9px">${gym.address}</div>
        ${gym.phone ? `<div style="color:#64748b;font-size:9px">${gym.phone}</div>` : ''}
      </div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0">
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <tr><td style="color:#64748b">Receipt No.</td><td style="text-align:right;font-weight:700">${data.receiptId}</td></tr>
        <tr><td style="color:#64748b">Date</td><td style="text-align:right">${date}</td></tr>
        <tr><td style="color:#64748b">Time</td><td style="text-align:right">${time}</td></tr>
      </table>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0">
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        ${transactionRows}
      </table>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0">
      <div style="text-align:center">
        <div style="color:#94a3b8;font-size:9px">${footer}</div>
        <div style="font-weight:700;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#94a3b8;margin-top:6px;border-top:1px dashed #e2e8f0;padding-top:6px">${label}</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html><html><head><title>Receipt ${data.receiptId}</title>
    <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body { margin:0; padding:15px; background:#fff; }
      @media print {
        @page { size: A4 landscape; margin: 8mm; }
        body { padding:0; }
      }
    </style>
  </head><body>
    <div style="display:flex;gap:16px;justify-content:center">
      ${makeCopy('CUSTOMER COPY', 'Thank you for choosing us!')}
      <div style="border-left:1px dashed #cbd5e1;margin:0 -8px"></div>
      ${makeCopy('OFFICE COPY', 'For office records only')}
      <div style="border-left:1px dashed #cbd5e1;margin:0 -8px"></div>
      ${makeCopy('ACCOUNTS COPY', 'Accounts department copy')}
    </div>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;
};

const ReceiptModal = ({ open, onClose, type, data }) => {
  if (!open || !data) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=500');
    if (printWindow) {
      printWindow.document.write(buildReceiptHTML(data, type));
      printWindow.document.close();
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="4xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {type === 'payment' ? 'Payment Receipt' : 'Sale Receipt'}
        </h3>
        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={handlePrint}>
            Print (A4 Trifold)
          </Button>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Receipt preview — 3 copies (print markup untouched) */}
      <div className="p-6 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col lg:flex-row gap-4 justify-center items-start">
          <ReceiptCopy data={data} type={type} copyLabel="CUSTOMER COPY" />
          <div className="hidden lg:block border-l border-dashed border-slate-300 self-stretch" />
          <ReceiptCopy data={data} type={type} copyLabel="OFFICE COPY" />
          <div className="hidden lg:block border-l border-dashed border-slate-300 self-stretch" />
          <ReceiptCopy data={data} type={type} copyLabel="ACCOUNTS COPY" />
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
