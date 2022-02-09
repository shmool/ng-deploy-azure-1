/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';

export default createBuilder<any>(async (builderConfig: any, context: BuilderContext): Promise<BuilderOutput> => {
  // TODO: remove cached creds
  context.logger.info('Logging out of Azure (removing cached Azure credentials) will be supported soon.');
  // context.logger.info('Cleared Azure credentials from cache.');
  return { success: true };
});
