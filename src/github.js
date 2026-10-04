const { GITHUB_API_URL, GITHUB_API_VERSION, GITHUB_PAGE_SIZE, SUMMARY_MARKER } = require('./constants');

const NO_CONTENT = 204;

const REVIEW_THREADS_QUERY = `
  query ($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes { id isResolved path line comments(first: 1) { nodes { author { login } body } } }
        }
      }
    }
  }`;
const RESOLVE_MUTATION = 'mutation ($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { id } } }';
const UNRESOLVE_MUTATION = 'mutation ($id: ID!) { unresolveReviewThread(input: { threadId: $id }) { thread { id } } }';

/** Low-level REST + GraphQL helpers bound to one token. */
function createRequester(token) {
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

  async function graphql(query, variables) {
    const result = await request('POST', '/graphql', { query, variables });
    if (result.errors) throw new Error(`GitHub GraphQL failed: ${JSON.stringify(result.errors)}`);
    return result.data;
  }

  return { request, paginate, graphql };
}

function toThread(node) {
  const firstComment = node.comments.nodes[0];
  return {
    id: node.id,
    isResolved: node.isResolved,
    path: node.path,
    line: node.line,
    author: firstComment?.author?.login,
    body: firstComment?.body,
  };
}

function createGithubClient({ token, repository, prNumber, botLogin }) {
  const { request, paginate, graphql } = createRequester(token);
  const pullPath = `/repos/${repository}/pulls/${prNumber}`;
  const issuePath = `/repos/${repository}/issues/${prNumber}`;

  async function listReviewThreads() {
    const [owner, name] = repository.split('/');
    const data = await graphql(REVIEW_THREADS_QUERY, { owner, name, number: prNumber });
    return data.repository.pullRequest.reviewThreads.nodes.map(toThread);
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
    listReviewThreads,
    setThreadResolved: (id, resolve) => graphql(resolve ? RESOLVE_MUTATION : UNRESOLVE_MUTATION, { id }),
    createReview: (commitId, comments) =>
      request('POST', `${pullPath}/reviews`, { commit_id: commitId, event: 'COMMENT', comments }),
    upsertSummary,
  };
}

module.exports = { createGithubClient };
