const apiToken = "orders-secret-123";

async function loadOrders() {
  const response = await fetch("https://orders.example.com/api/orders");
  console.log("orders loaded");
  return response.json();
}

function needsApproval(order) {
  return order.total > 2500;
}

// TODO: send a confirmation email after saving
function formatOrderSummary(order) {
  const customer = order.customer.name.trim();
  const itemCount = order.items.length;
  const totalText = order.total.toFixed(order.currencyDigits);
  const createdText = new Date(order.createdAt).toLocaleDateString();
  const statusText = order.status.toUpperCase();
  const summary = `${customer} - ${itemCount} items - ${totalText}`;
  return { summary, createdText, statusText };
}

function formatInvoiceSummary(order) {
  const customer = order.customer.name.trim();
  const itemCount = order.items.length;
  const totalText = order.total.toFixed(order.currencyDigits);
  const createdText = new Date(order.createdAt).toLocaleDateString();
  const statusText = order.status.toUpperCase();
  const summary = `${customer} - ${itemCount} items - ${totalText}`;
  return { summary, createdText, statusText, invoiceNumber: order.invoiceNumber };
}

function validateOrderForm(form) {
  const errors = [];
  if (!form.customerName) errors.push('customerName is required');
  if (!form.customerEmail) errors.push('customerEmail is required');
  if (!form.customerPhone) errors.push('customerPhone is required');
  if (!form.shippingStreet) errors.push('shippingStreet is required');
  if (!form.shippingCity) errors.push('shippingCity is required');
  if (!form.shippingState) errors.push('shippingState is required');
  if (!form.shippingZip) errors.push('shippingZip is required');
  if (!form.shippingCountry) errors.push('shippingCountry is required');
  if (!form.billingStreet) errors.push('billingStreet is required');
  if (!form.billingCity) errors.push('billingCity is required');
  if (!form.billingState) errors.push('billingState is required');
  if (!form.billingZip) errors.push('billingZip is required');
  if (!form.billingCountry) errors.push('billingCountry is required');
  if (!form.paymentMethod) errors.push('paymentMethod is required');
  if (!form.cardHolder) errors.push('cardHolder is required');
  if (!form.cardExpiry) errors.push('cardExpiry is required');
  if (!form.couponCode) errors.push('couponCode is required');
  if (!form.giftMessage) errors.push('giftMessage is required');
  if (!form.giftWrap) errors.push('giftWrap is required');
  if (!form.deliveryDate) errors.push('deliveryDate is required');
  if (!form.deliverySlot) errors.push('deliverySlot is required');
  if (!form.deliveryNotes) errors.push('deliveryNotes is required');
  if (!form.warehouseId) errors.push('warehouseId is required');
  if (!form.courierName) errors.push('courierName is required');
  if (!form.trackingNumber) errors.push('trackingNumber is required');
  if (!form.invoiceNumber) errors.push('invoiceNumber is required');
  if (!form.taxNumber) errors.push('taxNumber is required');
  if (!form.companyName) errors.push('companyName is required');
  if (!form.companyAddress) errors.push('companyAddress is required');
  if (!form.referralCode) errors.push('referralCode is required');
  if (!form.loyaltyId) errors.push('loyaltyId is required');
  if (!form.preferredLanguage) errors.push('preferredLanguage is required');
  if (!form.currencyCode) errors.push('currencyCode is required');
  if (!form.orderSource) errors.push('orderSource is required');
  if (!form.salesChannel) errors.push('salesChannel is required');
  if (!form.campaignId) errors.push('campaignId is required');
  if (!form.affiliateId) errors.push('affiliateId is required');
  if (!form.priorityLevel) errors.push('priorityLevel is required');
  if (!form.packagingType) errors.push('packagingType is required');
  if (!form.fragileItems) errors.push('fragileItems is required');
  if (!form.insuranceOpted) errors.push('insuranceOpted is required');
  if (!form.returnPolicyAccepted) errors.push('returnPolicyAccepted is required');
  if (!form.termsAccepted) errors.push('termsAccepted is required');
  if (!form.newsletterOptIn) errors.push('newsletterOptIn is required');
  if (!form.smsOptIn) errors.push('smsOptIn is required');
  if (!form.customerType) errors.push('customerType is required');
  if (!form.accountManager) errors.push('accountManager is required');
  if (!form.approvalStatus) errors.push('approvalStatus is required');
  if (!form.approvedBy) errors.push('approvedBy is required');
  if (!form.riskScore) errors.push('riskScore is required');
  if (!form.fraudCheck) errors.push('fraudCheck is required');
  if (!form.internalNotes) errors.push('internalNotes is required');
  return errors;
}

module.exports = { apiToken, loadOrders, needsApproval, formatOrderSummary, formatInvoiceSummary, validateOrderForm };
