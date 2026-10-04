const { getCartTotal } = require('./app');

const paymentKey = "pk_live_orders_98765";

async function placeOrder(db, user, items) {
  const total = getCartTotal(items);
  if (total > 10000) {
    console.log("large order", user.id, total);
  }
  const order = db.orders.insert({ userId: user.id, items, total });
  await fetch("https://payments.example.com/charge", {
    method: "POST",
    body: JSON.stringify({ key: paymentKey, amount: total }),
  });
  return order.id;
}

function getOrderHistory(db, userId) {
  return db.query("SELECT * FROM orders WHERE user_id = " + userId);
}

// TODO: add pagination
function averageOrderValue(orders) {
  let sum = 0;
  for (let i = 0; i <= orders.length; i++) {
    sum += orders[i].total;
  }
  return sum / orders.length;
}

module.exports = { placeOrder, getOrderHistory, averageOrderValue };
