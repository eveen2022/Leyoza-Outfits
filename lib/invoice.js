export const businessFields = {
  contact: { label: 'Business contact', max: 40 },
  bank: { label: 'Bank name', max: 60 },
  account: { label: 'Account number', max: 40 },
  branch: { label: 'Branch', max: 60 },
  paymentNote: { label: 'Payment note', max: 160, optional: true },
};

export const defaultBusiness = {
  contact: '0770248390', bank: 'Commercial Bank', account: '8002427559',
  branch: 'Panadura Branch', paymentNote: 'Cash payments are also accepted upon store pickup.',
};

export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function newDraft(sample = false) {
  return {
    number: sample ? 'INV-2026-005' : '',
    date: today(), customer: sample ? 'Ms. Ethmini Ruhansi' : '',
    address: sample ? 'Nalluruwa, Panadura' : '', phone: sample ? '0779042025' : '',
    fulfillment: 'Store Pickup', itemType: 'Custom T-Shirts', designs: sample ? 'Design 01 to Design 05' : '',
    delivery: 0, discount: 0,
    items: sample ? Array.from({ length: 5 }, (_, i) => ({
      description: `Custom Printed T-Shirt - Design ${String(i + 1).padStart(2, '0')}`,
      detail: 'Front & Back Customized', qty: 1, price: 2100,
    })) : [{ description: '', detail: '', qty: 1, price: 0 }],
  };
}

export const money = value => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const cents = value => Math.round(Number(value || 0) * 100);
export function totals(draft) {
  const subtotal = draft.items.reduce((sum, item) => sum + cents(item.price) * Number(item.qty || 0), 0);
  const delivery = draft.fulfillment === 'Delivery' ? cents(draft.delivery) : 0;
  return { subtotal, delivery, qty: draft.items.reduce((sum, item) => sum + Number(item.qty || 0), 0), total: subtotal + delivery - cents(draft.discount) };
}

export const deliveryNote = draft => draft.fulfillment === 'Delivery'
  ? 'Delivery (Delivery Charges Applied)'
  : 'Customer Self-Pickup (No Delivery Charges Applied)';

export function formattedDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function text(value, key, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new Error(`Invalid ${key}. ${required ? 'A value is required. ' : ''}Maximum ${max} characters.`);
  }
  return value;
}

function amount(value, key, max, integer = false) {
  // Empty numeric fields are valid unfinished drafts; export validates them separately.
  if (value === '') return '';
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`Invalid ${key}. Enter a ${integer ? 'whole ' : ''}number from 0 to ${max}.`);
  }
  return value;
}

export function validateBusiness(value) {
  if (!value || typeof value !== 'object') throw new Error('Business details must be an object.');
  return Object.fromEntries(Object.entries(businessFields).map(([key, field]) => [key, text(value[key], field.label, field.max, !field.optional).trim()]));
}

export function validateDraft(value) {
  if (!value || typeof value !== 'object') throw new Error('Invoice draft must be an object.');
  const result = {};
  for (const [key, max] of Object.entries({ number: 40, date: 10, customer: 80, address: 160, phone: 40, itemType: 40, designs: 70 })) {
    result[key] = text(value[key], key, max);
  }
  if (result.date && (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || Number.isNaN(Date.parse(result.date)) || new Date(result.date).toISOString().slice(0, 10) !== result.date)) throw new Error('Invalid invoice date.');
  if (!['Store Pickup', 'Delivery'].includes(value.fulfillment)) throw new Error('Invalid delivery method.');
  result.fulfillment = value.fulfillment;
  result.delivery = value.fulfillment === 'Store Pickup' ? 0 : amount(value.delivery, 'delivery', 100000000);
  result.discount = amount(value.discount, 'discount', 100000000);
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 100) throw new Error('An invoice must contain 1 to 100 items.');
  result.items = value.items.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid line item.');
    return { description: text(item.description, 'item description', 100), detail: text(item.detail, 'item details', 100), qty: amount(item.qty, 'quantity', 9999, true), price: amount(item.price, 'price', 100000000) };
  });
  return result;
}
