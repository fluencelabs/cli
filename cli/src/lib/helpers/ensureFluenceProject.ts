/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { commandObj, isInteractive } from "../commandObj.js";
import {
  type FluenceConfig,
  initFluenceConfig,
} from "../configs/project/fluence.js";
import { init } from "../init.js";
import { confirm } from "../prompt.js";

export const ensureFluenceProject = async (): Promise<FluenceConfig> => {
  const fluenceConfig = await initFluenceConfig();

  if (fluenceConfig !== null) {
    return fluenceConfig;
  }

  const errorMessage = "Not a fluence project";

  if (!isInteractive) {
    commandObj.error(errorMessage);
  }

  commandObj.warn(errorMessage);

  const doInit = await confirm({
    message: `Do you want to init fluence project`,
  });

  if (!doInit) {
    commandObj.error(
      "Initialized fluence project is required in order to continue",
    );
  }

  return init();
};
