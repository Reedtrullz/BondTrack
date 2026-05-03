function buildChangelogQuery(searchQuery, typeFilter) {
  const params = new URLSearchParams();

  if (searchQuery.trim()) {
    params.set('q', searchQuery);
  }

  if (typeFilter !== 'all') {
    params.set('type', typeFilter);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '?' ;
}

console.log('Empty params:', buildChangelogQuery('', 'all'));
console.log('Type filter only:', buildChangelogQuery('', 'bug'));
console.log('Search only:', buildChangelogQuery('test', 'all'));
console.log('Both params:', buildChangelogQuery('test', 'bug'));
console.log('Type filter with space:', buildChangelogQuery('', 'update'));