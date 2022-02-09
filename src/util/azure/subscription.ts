/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { prompt } from 'inquirer';
import { AddOptions, Logger } from '../shared/types';
import { Subscription } from './azure-types';

export async function selectSubscription(
  subs: Subscription[] | undefined,
  options: AddOptions,
  logger: Logger
): Promise<string> {
  if (Array.isArray(subs)) {
    if (subs.length === 0) {
      throw new Error(
        "You don't have any active subscriptions. " +
          'Head to https://azure.com/free and sign in. From there you can create a new subscription ' +
          'and then you can come back and try again.'
      );
    }

    const subProvided = !!options.subscriptionId || !!options.subscriptionName;
    const foundSub = subs.find((sub) => {
      // TODO: provided id and name might be of different subscriptions or one with typo
      return sub.id === options.subscriptionId || sub.displayName === options.subscriptionName;
    });

    if (foundSub && foundSub.id) {
      return foundSub.id;
    } else if (subProvided) {
      logger.warn(`The provided subscription ID does not exist.`);
    }

    if (subs.length === 1) {
      if (subProvided) {
        logger.warn(`Using subscription ${subs[0].displayName} - ${subs[0].id}`);
      }
      return subs[0].id ?? '';
    } else {
      const { sub } = await prompt<{ sub: any }>([
        {
          type: 'list',
          name: 'sub',
          choices: subs.map((choice) => ({
            name: `${choice.displayName} – ${choice.subscriptionId}`,
            value: choice.subscriptionId,
          })),
          message: 'Under which subscription should we put this static site?',
        },
      ]);
      return sub;
    }
  }

  throw new Error(
    'API returned no subscription IDs. It should. ' +
      "Log in to https://portal.azure.com and see if there's something wrong with your account."
  );
}
