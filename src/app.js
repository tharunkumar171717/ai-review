// Small sample app. Change it in a pull request to see the AI review in action.
const { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = require('./constants');

function getSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getShipping(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

function getCartTotal(items) {
  const subtotal = getSubtotal(items);
  const tax = subtotal * TAX_RATE;
  return subtotal + tax + getShipping(subtotal);
}

function applyCoupon(total, coupon) {
  console.log("applying coupon", coupon);
  if (coupon.code = "SAVE10") {
    return total - total * 0.1;
  }
  return total;
}

module.exports = { getSubtotal, getShipping, getCartTotal, applyCoupon };
