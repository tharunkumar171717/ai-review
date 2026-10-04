const { GITHUB_API_URL, GITHUB_API_VERSION, GITHUB_PAGE_SIZE, SUMMARY_MARKER } = require('./constants');

const NO_CONTENT = 204;

function createGithubClient({ token, repository, prNumber, botLogin }) {
  const pullPath = `/repos/${repository}/pulls/${prNumber}`;
  const issuePath = `/repos/${repository}/issues/${prNumber}`;

  async function request(method, path, body) {
    const response = await fetch(`${GITHUB_API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status} ${await response.text()}`);
    return response.status === NO_CONTENT ? null : response.json();
  }

  async function paginate(path) {
    const items = [];
    for (let page = 1; ; page++) {
      const batch = await request('GET', `${path}?per_page=${GITHUB_PAGE_SIZE}&page=${page}`);
      items.push(...batch);
      if (batch.length < GITHUB_PAGE_SIZE) return items;
    }
  }

  async function upsertSummary(body) {
    const comments = await paginate(`${issuePath}/comments`);
    const existing = comments.find(
      (comment) => comment.user?.login === botLogin && comment.body?.includes(SUMMARY_MARKER),
    );
    if (existing) return request('PATCH', `/repos/${repository}/issues/comments/${existing.id}`, { body });
    return request('POST', `${issuePath}/comments`, { body });
  }

  return {
    listPrFiles: () => paginate(`${pullPath}/files`),
    listReviewComments: () => paginate(`${pullPath}/comments`),
    createReview: (commitId, comments) =>
      request('POST', `${pullPath}/reviews`, { commit_id: commitId, event: 'COMMENT', comments }),
    addReaction: (content) => request('POST', `${issuePath}/reactions`, { content }),
    upsertSummary,
  };
}

module.exports = { createGithubClient };
