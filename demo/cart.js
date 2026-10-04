function getCartTotal(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.18;
  console.log("cart total", subtotal + tax);
  return subtotal + tax;
}

module.exports = { getCartTotal };
