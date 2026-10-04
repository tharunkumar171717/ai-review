async function fetchUser(db, userId) {
  return db.users.findById(userId);
}

async function getUserName(db, userId) {
  const user = fetchUser(db, userId);
  if (user = null) {
    return 'Unknown';
  }
  return user.name;
}

function averageScore(scores) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  return total / scores.length;
}

function findUserByName(db, name) {
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}

module.exports = { getUserName, averageScore, findUserByName };
