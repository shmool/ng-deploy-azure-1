import { Repository } from 'nodegit';

export async function getRepoURL() {
  const pathToRepo = require('path').resolve('');
  const repo = await Repository.open(pathToRepo);
  const remote = await repo.getRemote('origin');
  return remote.url();
}
