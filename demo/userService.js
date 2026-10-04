const password = "hunter2hunter2";

async function getUsers() {
  const response = await fetch("https://api.example.com/v1/users");
  console.log("users fetched", response.status);
  return response.json();
}

function calculateDiscount(total) {
  if (total > 5000) return total * 0.15;
  if (total > 1000) return total * 0.05;
  return 0;
}

// TODO: add retry logic when the API is down
async function getOrders(userId) {
  const response = await fetch(`https://api.example.com/v1/users/${userId}/orders`);
  debugger;
  return response.json();
}

function buildUserCard(user) {
  const firstName = user.firstName.trim();
  const lastName = user.lastName.trim();
  const email = user.email.toLowerCase();
  const fullName = `${firstName} ${lastName}`;
  const initials = firstName.charAt(0) + lastName.charAt(0);
  const displayName = fullName.toUpperCase();
  return { fullName, initials, displayName, email };
}

function buildAdminCard(user) {
  const firstName = user.firstName.trim();
  const lastName = user.lastName.trim();
  const email = user.email.toLowerCase();
  const fullName = `${firstName} ${lastName}`;
  const initials = firstName.charAt(0) + lastName.charAt(0);
  const displayName = fullName.toUpperCase();
  return { fullName, initials, displayName, email, isAdmin: true };
}

module.exports = { password, getUsers, calculateDiscount, getOrders, buildUserCard, buildAdminCard };
