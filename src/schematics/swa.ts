import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

export default function (_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const res = await deployToSWA();
    _context.logger.info(res);
  };
}

export type DeployInformation = {
  branch: string;
  repositoryUrl: string;
  appName: string;
};

async function deployToSWA() {
  return 'success';
}
