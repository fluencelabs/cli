import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Blueprints extends Command {
  static description = 'Get a list of blueprints from a node.'

  static examples = [
    `$ fluence blueprints --host 134.209.186.43 --port 9100 --peer 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM
[
  {
    "dependencies": [
      "3a28ca64-d653-4266-acfc-560b9f352750"
    ],
    "id": "a7497222-7c51-430a-af89-91734fc67389",
    "name": "some test blueprint"
  },
  {
    "dependencies": [
      "dd0b2987-c5fa-468f-bf0a-55ff35a01c29"
    ],
    "id": "166c125c-5fdc-4384-8b4a-8f0724b6b6a9",
    "name": "some blueprint"
  }
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
  }

  static args = []

  async run() {
    const {flags} = this.parse(Blueprints)

    let conn = await getConnection(flags);

    let interfaces = await conn.getAvailableBlueprints(flags.targetPeer)

    this.log(JSON.stringify(interfaces, undefined, 2));

    await conn.disconnect();
  }
}
