import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { getGitHubOAuthToken } from '../util/github/auth';

export default function (_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const gitHubToken = await getGitHubOAuthToken();
    _context.logger.info('XXX github token: ' + gitHubToken);
  };
}
